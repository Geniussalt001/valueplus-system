const DEV_ACCESS_USER_PROPERTY =
  "DEV_ACCESS_USER";

const DEV_ACCESS_PEPPER_PROPERTY =
  "DEV_ACCESS_PEPPER";

const DEV_ACCESS_PASSWORD_MAC_PROPERTY =
  "DEV_ACCESS_PASSWORD_MAC";

const DEV_ACCESS_ATTEMPT_PREFIX =
  "DEV_ACCESS_ATTEMPT_";

const DEV_ACCESS_MAX_FAILED_ATTEMPTS =
  5;

const DEV_ACCESS_LOCK_MILLISECONDS =
  5 * 60 * 1000;

/*
 * Run this function manually from the Apps Script editor once when
 * setting or rotating the DEV credential. Never commit the real
 * password to source control.
 */
function configureDevAccess(
  userName,
  password,
) {
  const normalizedUser =
    normalizeDevAccessUser(
      userName,
    );

  const normalizedPassword =
    String(password || "");

  if (!normalizedUser) {
    throw new Error(
      "กรุณากำหนด USER สำหรับ DEV",
    );
  }

  if (
    normalizedPassword.length < 4
  ) {
    throw new Error(
      "PASSWORD สำหรับ DEV ต้องมีอย่างน้อย 4 ตัวอักษร",
    );
  }

  const pepper =
    Utilities.getUuid()
      .replace(/-/g, "") +
    Utilities.getUuid()
      .replace(/-/g, "");

  const passwordMac =
    createDevPasswordMac(
      normalizedUser,
      normalizedPassword,
      pepper,
    );

  PropertiesService
    .getScriptProperties()
    .setProperties({
      [DEV_ACCESS_USER_PROPERTY]:
        normalizedUser,
      [DEV_ACCESS_PEPPER_PROPERTY]:
        pepper,
      [DEV_ACCESS_PASSWORD_MAC_PROPERTY]:
        passwordMac,
    });

  clearDevAccessAttemptProperties();

  return {
    configured: true,
    userName: normalizedUser,
  };
}

function verifyDevAccess(
  input,
  deviceToken,
) {
  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error(
      "ระบบ DEV กำลังตรวจสอบคำขออื่น กรุณาลองใหม่อีกครั้ง",
    );
  }

  try {
    return verifyDevAccessWithinLock(
      input,
      deviceToken,
    );
  } finally {
    lock.releaseLock();
  }
}

function verifyDevAccessWithinLock(
  input,
  deviceToken,
) {
  const properties =
    PropertiesService
      .getScriptProperties();

  const expectedUser =
    normalizeDevAccessUser(
      properties.getProperty(
        DEV_ACCESS_USER_PROPERTY,
      ),
    );

  const pepper =
    String(
      properties.getProperty(
        DEV_ACCESS_PEPPER_PROPERTY,
      ) || "",
    );

  const expectedPasswordMac =
    String(
      properties.getProperty(
        DEV_ACCESS_PASSWORD_MAC_PROPERTY,
      ) || "",
    );

  if (
    !expectedUser ||
    !pepper ||
    !expectedPasswordMac
  ) {
    throw new Error(
      "ยังไม่ได้ตั้งค่าสิทธิ์ DEV บนเซิร์ฟเวอร์",
    );
  }

  const attemptProperty =
    getDevAccessAttemptProperty(
      deviceToken,
    );

  const attemptState =
    readDevAccessAttemptState(
      properties,
      attemptProperty,
    );

  const now = Date.now();

  if (
    attemptState.lockedUntil > now
  ) {
    const retryAfterSeconds =
      Math.max(
        1,
        Math.ceil(
          (attemptState.lockedUntil - now) /
            1000,
        ),
      );

    return {
      success: false,
      locked: true,
      remainingAttempts: 0,
      retryAfterSeconds:
        retryAfterSeconds,
      message:
        "DEV TOOLS ถูกล็อกชั่วคราว กรุณาลองใหม่ใน " +
        formatDevAccessWaitTime(
          retryAfterSeconds,
        ),
    };
  }

  const suppliedUser =
    normalizeDevAccessUser(
      input && input.userName,
    );

  const suppliedPassword =
    String(
      input && input.password || "",
    );

  const suppliedPasswordMac =
    createDevPasswordMac(
      suppliedUser,
      suppliedPassword,
      pepper,
    );

  const userMatches =
    secureDevValueEquals(
      suppliedUser,
      expectedUser,
    );

  const passwordMatches =
    secureDevValueEquals(
      suppliedPasswordMac,
      expectedPasswordMac,
    );

  if (
    userMatches &&
    passwordMatches
  ) {
    properties.deleteProperty(
      attemptProperty,
    );

    return {
      success: true,
      locked: false,
      remainingAttempts:
        DEV_ACCESS_MAX_FAILED_ATTEMPTS,
      retryAfterSeconds: 0,
      message:
        "ยืนยันสิทธิ์ DEV สำเร็จ",
    };
  }

  const failedAttempts =
    attemptState.failedAttempts + 1;

  if (
    failedAttempts >=
    DEV_ACCESS_MAX_FAILED_ATTEMPTS
  ) {
    properties.setProperty(
      attemptProperty,
      JSON.stringify({
        failedAttempts: 0,
        lockedUntil:
          now +
          DEV_ACCESS_LOCK_MILLISECONDS,
      }),
    );

    return {
      success: false,
      locked: true,
      remainingAttempts: 0,
      retryAfterSeconds:
        Math.ceil(
          DEV_ACCESS_LOCK_MILLISECONDS /
            1000,
        ),
      message:
        "กรอกข้อมูลผิดครบ 5 ครั้ง DEV TOOLS ถูกล็อก 5 นาที",
    };
  }

  properties.setProperty(
    attemptProperty,
    JSON.stringify({
      failedAttempts:
        failedAttempts,
      lockedUntil: 0,
    }),
  );

  const remainingAttempts =
    DEV_ACCESS_MAX_FAILED_ATTEMPTS -
    failedAttempts;

  return {
    success: false,
    locked: false,
    remainingAttempts:
      remainingAttempts,
    retryAfterSeconds: 0,
    message:
      "USER หรือ PASSWORD ไม่ถูกต้อง เหลืออีก " +
      remainingAttempts +
      " ครั้ง",
  };
}

function normalizeDevAccessUser(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function createDevPasswordMac(
  userName,
  password,
  pepper,
) {
  const signature =
    Utilities.computeHmacSha256Signature(
      String(password || "") +
        ":" +
        normalizeDevAccessUser(
          userName,
        ),
      String(pepper || ""),
      Utilities.Charset.UTF_8,
    );

  return signature
    .map(function (byte) {
      const normalized =
        byte < 0
          ? byte + 256
          : byte;

      return normalized
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}

function getDevAccessAttemptProperty(
  deviceToken,
) {
  const tokenFingerprint =
    hashDeviceValue(
      String(deviceToken || ""),
    ).slice(0, 32);

  return (
    DEV_ACCESS_ATTEMPT_PREFIX +
    tokenFingerprint
  );
}

function readDevAccessAttemptState(
  properties,
  propertyName,
) {
  const savedValue =
    properties.getProperty(
      propertyName,
    );

  if (!savedValue) {
    return {
      failedAttempts: 0,
      lockedUntil: 0,
    };
  }

  try {
    const parsed =
      JSON.parse(savedValue);

    return {
      failedAttempts:
        Math.max(
          0,
          Number(
            parsed.failedAttempts ||
              0,
          ),
        ),
      lockedUntil:
        Math.max(
          0,
          Number(
            parsed.lockedUntil ||
              0,
          ),
        ),
    };
  } catch (_error) {
    properties.deleteProperty(
      propertyName,
    );

    return {
      failedAttempts: 0,
      lockedUntil: 0,
    };
  }
}

function clearDevAccessAttemptProperties() {
  const properties =
    PropertiesService
      .getScriptProperties();

  const savedProperties =
    properties.getProperties();

  Object.keys(savedProperties)
    .filter(function (name) {
      return name.indexOf(
        DEV_ACCESS_ATTEMPT_PREFIX,
      ) === 0;
    })
    .forEach(function (name) {
      properties.deleteProperty(
        name,
      );
    });
}

function secureDevValueEquals(
  first,
  second,
) {
  const valueA =
    String(first || "");
  const valueB =
    String(second || "");

  if (
    valueA.length !== valueB.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < valueA.length;
    index += 1
  ) {
    difference |=
      valueA.charCodeAt(index) ^
      valueB.charCodeAt(index);
  }

  return difference === 0;
}

function formatDevAccessWaitTime(
  seconds,
) {
  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  if (minutes === 0) {
    return (
      Math.max(
        1,
        remainingSeconds,
      ) + " วินาที"
    );
  }

  if (remainingSeconds === 0) {
    return minutes + " นาที";
  }

  return (
    minutes +
    " นาที " +
    remainingSeconds +
    " วินาที"
  );
}

