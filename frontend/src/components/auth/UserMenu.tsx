"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { MaskedAvatars } from "@/components/ui/MaskedAvatars";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface UserMenuProps {
  username: string | null;
}

/**
 * The masked operative avatar (round clipped avatar with a name ring that
 * reveals on hover). Clicking it opens the dedicated operative profile page.
 */
export default function UserMenu({ username }: UserMenuProps) {
  const name = username ?? "Profile";

  const avatars = useMemo(
    () => [
      {
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`,
        name,
      },
    ],
    [name]
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/profile"
          aria-label="Open operative profile"
          className="group inline-flex items-center rounded-xl border border-secondary/40 bg-secondary/10 hover:border-secondary hover:shadow-glow-blue transition-all duration-300 px-1 py-0.5"
        >
          <MaskedAvatars
            avatars={avatars}
            size={46}
            border={4}
            column={30}
            movement={0.55}
            transition={0.22}
            offset={-2}
            ringed
            blurOnRest
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">Open operative profile</TooltipContent>
    </Tooltip>
  );
}
