import { describe, expect, it } from "vitest";
import { hasPhotoMetadata } from "../utils/hasPhotoMetadata";

const createPhoto = (text: string): Blob => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe1]), text, new Uint8Array([0, 200])]);

describe("hasPhotoMetadata", () => {
  it.each(["Exif\0\0", "eXIf", "EXIF", "XMP ", "http://ns.adobe.com/xap/1.0/", "XML:com.adobe.xmp", "Photoshop 3.0"])(
    "finds %j",
    async (text) => {
      await expect(hasPhotoMetadata(createPhoto(text))).resolves.toBe(true);
    },
  );

  it("finds nothing in a clean photo", async () => {
    await expect(hasPhotoMetadata(createPhoto("JFIF"))).resolves.toBe(false);
  });
});
