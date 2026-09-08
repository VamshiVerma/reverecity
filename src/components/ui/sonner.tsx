
import React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  // Provide a fallback theme to avoid the null error
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-left"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover/90 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:rounded-xl group-[.toaster]:shadow-lift",
          title: "group-[.toast]:font-display group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-highlight group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-white/[0.06] group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          icon: "group-[.toast]:text-highlight",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
