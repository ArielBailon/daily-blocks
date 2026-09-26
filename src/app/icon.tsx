import { renderAppIcon } from "@/lib/app-icon";

const ICON_SIZES = [192, 512];

export function generateImageMetadata() {
  return ICON_SIZES.map((size) => ({
    id: String(size),
    contentType: "image/png",
    size: { width: size, height: size },
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return renderAppIcon(Number(await id));
}
