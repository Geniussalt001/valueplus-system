export const MAX_PDF_SIZE =
  8 * 1024 * 1024;

export function fileToBase64(
  file: File,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64Data = result.split(",")[1];

      if (!base64Data) {
        reject(
          new Error("ไม่สามารถอ่านข้อมูล PDF ได้"),
        );
        return;
      }

      resolve(base64Data);
    };

    reader.onerror = () => {
      reject(
        new Error("เกิดข้อผิดพลาดขณะอ่าน PDF"),
      );
    };

    reader.readAsDataURL(file);
  });
}

export function base64ToPdfUrl(
  base64Data: string,
): string {
  const binary = window.atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], {
    type: "application/pdf",
  });

  return URL.createObjectURL(blob);
}