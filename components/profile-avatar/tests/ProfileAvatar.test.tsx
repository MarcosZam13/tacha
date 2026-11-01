// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileAvatar } from "../ProfileAvatar";

const AVATAR_URL = "https://proyecto.supabase.co/storage/v1/object/public/avatars/u/foto.png";

afterEach(cleanup);

describe("ProfileAvatar", () => {
  it("shows the photo when there is one, as decoration", () => {
    const { container } = render(<ProfileAvatar avatarUrl={AVATAR_URL} initials="AP" />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryByText("AP")).not.toBeInTheDocument();
  });

  it("shows the initials when there is no photo", () => {
    render(<ProfileAvatar avatarUrl={null} initials="AP" />);

    expect(screen.getByText("AP")).toBeInTheDocument();
  });

  it("shows a generic icon when there is neither photo nor name", () => {
    const { container } = render(<ProfileAvatar avatarUrl={null} initials={null} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
