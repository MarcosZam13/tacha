// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removePhotoMetadata } from "../utils/removePhotoMetadata";
import { createPhotoFile } from "./recipe.fixtures";

const closeMock = vi.fn();
const createBitmapMock = vi.fn();
const drawMock = vi.fn();
let producedBlob: Blob | null;

// jsdom no dibuja: se reemplaza el canvas y se revisa qué se le pide.
beforeEach(() => {
  vi.resetAllMocks();
  producedBlob = new Blob(["limpia"], { type: "image/jpeg" });
  createBitmapMock.mockResolvedValue({ close: closeMock, height: 600, width: 800 });
  vi.stubGlobal("createImageBitmap", createBitmapMock);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: drawMock } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(producedBlob));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("removePhotoMetadata", () => {
  it("draws the photo again with its orientation and keeps its size", async () => {
    const file = createPhotoFile();

    const cleanFile = await removePhotoMetadata(file);

    expect(createBitmapMock).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
    expect(drawMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
    expect(cleanFile).not.toBe(file);
    expect(cleanFile.type).toBe("image/jpeg");
    expect(closeMock).toHaveBeenCalled();
  });

  it("shrinks a big photo without deforming it", async () => {
    createBitmapMock.mockResolvedValue({ close: closeMock, height: 2048, width: 4096 });

    await removePhotoMetadata(createPhotoFile());

    expect(drawMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1024);
  });

  it("keeps the type the browser produced", async () => {
    producedBlob = new Blob(["limpia"], { type: "image/png" });

    expect(await removePhotoMetadata(createPhotoFile("image/webp"))).toMatchObject({ name: "foto.png", type: "image/png" });
  });

  it.each([
    ["the browser gives nothing", () => { producedBlob = null; }],
    ["the result is empty", () => { producedBlob = new Blob([], { type: "image/jpeg" }); }],
    ["the result is too heavy", () => { producedBlob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/jpeg" }); }],
    ["there is no canvas", () => { vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null); }],
  ])("fails, and frees the memory, when %s", async (_case, arrange) => {
    arrange();

    await expect(removePhotoMetadata(createPhotoFile())).rejects.toThrow();
    expect(closeMock).toHaveBeenCalled();
  });

  it("fails when the file is not an image", async () => {
    createBitmapMock.mockRejectedValue(new Error("decode"));

    await expect(removePhotoMetadata(createPhotoFile())).rejects.toThrow("decode");
  });
});
