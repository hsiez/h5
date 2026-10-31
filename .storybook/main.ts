import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: [
    "../stories/primitives/**/*.stories.@(ts|tsx)",
    "../stories/composites/**/*.stories.@(ts|tsx)",
    "../stories/pages/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  viteFinal: async (config, { configType }) => {
    if (configType === "DEVELOPMENT") {
      config.server ??= {};
      config.server.proxy = {
        ...config.server.proxy,
        "/api/mail-provider": { target: "http://localhost:3000", changeOrigin: true },
        "/stadia": {
          target: "https://tiles.stadiamaps.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/stadia/, ""),
        },
      };
    }
    return config;
  },
};

export default config;
