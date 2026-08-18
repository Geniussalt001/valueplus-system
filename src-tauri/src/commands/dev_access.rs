use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::State;

const DEV_USER: &str = "VPRW";
const PASSWORD_SALT: &[u8] = b"valueplus-dev-tools-v1";
const PASSWORD_HASH_ROUNDS: usize = 200_000;
const EXPECTED_PASSWORD_HASH: [u8; 32] = [
    0xd4, 0xcd, 0x3d, 0x51, 0x4f, 0xe6, 0x30, 0x63,
    0xe2, 0x25, 0x7d, 0x9d, 0xc7, 0xaa, 0xe2, 0x43,
    0xd3, 0x71, 0xd8, 0x9d, 0x8d, 0x13, 0xac, 0xd0,
    0xe0, 0x03, 0xbe, 0x8d, 0x5d, 0xaa, 0x6d, 0x1b,
];

const MAX_FAILED_ATTEMPTS: u8 = 5;
const LOCK_DURATION: Duration = Duration::from_secs(5 * 60);

#[derive(Default)]
pub struct DevAccessState {
    attempts: Mutex<DevAccessAttempts>,
}

#[derive(Default)]
struct DevAccessAttempts {
    failed_attempts: u8,
    locked_until: Option<Instant>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevAccessResult {
    success: bool,
    locked: bool,
    remaining_attempts: u8,
    retry_after_seconds: u64,
    message: String,
}

#[tauri::command]
pub fn verify_dev_access(
    state: State<'_, DevAccessState>,
    user_name: String,
    password: String,
) -> Result<DevAccessResult, String> {
    let mut attempts = state
        .attempts
        .lock()
        .map_err(|_| "ตรวจสอบสถานะ DEV ไม่สำเร็จ".to_string())?;

    let now = Instant::now();

    if let Some(locked_until) = attempts.locked_until {
        if locked_until > now {
            let retry_after_seconds = locked_until
                .saturating_duration_since(now)
                .as_secs()
                .max(1);

            return Ok(DevAccessResult {
                success: false,
                locked: true,
                remaining_attempts: 0,
                retry_after_seconds,
                message: format!(
                    "DEV TOOLS ถูกล็อกชั่วคราว กรุณาลองใหม่ใน {}",
                    format_wait_time(retry_after_seconds),
                ),
            });
        }

        attempts.locked_until = None;
        attempts.failed_attempts = 0;
    }

    let supplied_hash = hash_password(&password);
    let password_matches = constant_time_equals(
        &supplied_hash,
        &EXPECTED_PASSWORD_HASH,
    );
    let user_matches = user_name
        .trim()
        .eq_ignore_ascii_case(DEV_USER);

    if user_matches && password_matches {
        attempts.failed_attempts = 0;
        attempts.locked_until = None;

        return Ok(DevAccessResult {
            success: true,
            locked: false,
            remaining_attempts: MAX_FAILED_ATTEMPTS,
            retry_after_seconds: 0,
            message: "ยืนยันสิทธิ์ DEV สำเร็จ".to_string(),
        });
    }

    attempts.failed_attempts = attempts
        .failed_attempts
        .saturating_add(1);

    if attempts.failed_attempts >= MAX_FAILED_ATTEMPTS {
        attempts.failed_attempts = 0;
        attempts.locked_until = Some(now + LOCK_DURATION);

        return Ok(DevAccessResult {
            success: false,
            locked: true,
            remaining_attempts: 0,
            retry_after_seconds: LOCK_DURATION.as_secs(),
            message: "กรอกข้อมูลผิดครบ 5 ครั้ง DEV TOOLS ถูกล็อก 5 นาที"
                .to_string(),
        });
    }

    let remaining_attempts = MAX_FAILED_ATTEMPTS
        .saturating_sub(attempts.failed_attempts);

    Ok(DevAccessResult {
        success: false,
        locked: false,
        remaining_attempts,
        retry_after_seconds: 0,
        message: format!(
            "USER หรือ PASSWORD ไม่ถูกต้อง เหลืออีก {} ครั้ง",
            remaining_attempts,
        ),
    })
}

fn hash_password(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(PASSWORD_SALT);
    hasher.update(password.as_bytes());
    let mut digest: [u8; 32] = hasher
        .finalize()
        .into();

    for _ in 1..PASSWORD_HASH_ROUNDS {
        let mut round = Sha256::new();
        round.update(digest);
        round.update(PASSWORD_SALT);
        digest = round.finalize().into();
    }

    digest
}

fn constant_time_equals(
    first: &[u8; 32],
    second: &[u8; 32],
) -> bool {
    let mut difference = 0_u8;

    for index in 0..first.len() {
        difference |= first[index] ^ second[index];
    }

    difference == 0
}

fn format_wait_time(seconds: u64) -> String {
    let minutes = seconds / 60;
    let remaining_seconds = seconds % 60;

    if minutes == 0 {
        return format!("{} วินาที", remaining_seconds.max(1));
    }

    if remaining_seconds == 0 {
        return format!("{} นาที", minutes);
    }

    format!("{} นาที {} วินาที", minutes, remaining_seconds)
}
