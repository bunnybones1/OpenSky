// vite.config.mts
import dsv from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/@rollup+plugin-dsv@3.0.4/node_modules/@rollup/plugin-dsv/dist/es/index.js";
import react from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/@vitejs+plugin-react@4.0.4_vite@4.4.8/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path3 from "path";
import { defineConfig } from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/vite@4.4.8_@types+node@20.6.3/node_modules/vite/dist/node/index.js";
import checker from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/vite-plugin-checker@0.6.1_eslint@8.49.0_typescript@5.2.2_vite@4.4.8/node_modules/vite-plugin-checker/dist/esm/main.js";
import eslint from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/vite-plugin-eslint@1.8.1_eslint@8.49.0_vite@4.4.8/node_modules/vite-plugin-eslint/dist/index.mjs";
import { viteStaticCopy } from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/vite-plugin-static-copy@0.17.0_vite@4.4.8/node_modules/vite-plugin-static-copy/dist/index.js";
import tsconfigPaths from "file:///C:/Users/gamed/Documents/Github/OpenSky/node_modules/.pnpm/vite-tsconfig-paths@4.2.0_typescript@5.2.2_vite@4.4.8/node_modules/vite-tsconfig-paths/dist/index.mjs";

// ../design-data/scripts/dataLocations.ts
import path from "node:path";
var __vite_injected_original_dirname = "C:\\Users\\gamed\\Documents\\Github\\OpenSky\\design-data\\scripts";
var designDataFolderPath = path.join(__vite_injected_original_dirname, "../");
var dataFolderPath = path.join(designDataFolderPath, "./raw");
var sheetsFolderPath = path.join(dataFolderPath, "./sheets");
var cardsFolderPath = path.join(sheetsFolderPath, "./cards");

// ../design-data/scripts/fs-to-json.ts
import { opendir, readFile } from "node:fs/promises";
import path2 from "node:path";
async function* walk(dir) {
  for await (const d of await opendir(dir)) {
    const entry = path2.join(dir, d.name);
    if (d.name.startsWith("."))
      continue;
    if (d.isDirectory())
      yield* await walk(entry);
    else if (d.isFile())
      yield entry;
  }
}
async function filesystemToJSON(rootFolder) {
  const allReadPromises = [];
  const rootFolderDepth = rootFolder.split(path2.sep).length;
  const json = {};
  for await (const file of walk(rootFolder)) {
    const parts = file.split(path2.sep).slice(rootFolderDepth);
    let obj = json;
    for (const part of parts) {
      if (part === parts[parts.length - 1]) {
        allReadPromises.push(
          readFile(file, "utf8").then((f) => obj[part] = JSON.parse(f)).catch((err) => {
            throw new Error(`Error parsing ${file}: ${err}`);
          })
        );
      } else {
        obj[part] = obj[part] || {};
        obj = obj[part];
      }
    }
  }
  await Promise.all(allReadPromises);
  return json;
}

// vite.config.mts
var __vite_injected_original_dirname2 = "C:\\Users\\gamed\\Documents\\Github\\OpenSky\\sheets";
var resolvePath = (str) => path3.resolve(__vite_injected_original_dirname2, str);
var vite_config_default = defineConfig({
  server: {
    host: true,
    port: 1997,
    proxy: {
      "/assets": {
        target: "http://localhost:4001/",
        rewrite: (path4) => path4.replace(/^\/assets/, "")
      }
    }
  },
  base: process.env.GITCOMMIT ? `/sheets/${process.env.GITCOMMIT}/` : void 0,
  build: {
    outDir: "./dist/sheets",
    sourcemap: true,
    minify: false
  },
  plugins: [
    react({
      jsxRuntime: "automatic"
    }),
    tsconfigPaths(),
    dsv(),
    checker({ typescript: true }),
    viteStaticCopy({
      targets: [
        {
          src: "../*/locales/*",
          dest: `./locales/${process.env.GITCOMMIT ?? "dev"}/`
        },
        {
          src: "../lib/*/locales/*",
          dest: `./locales/${process.env.GITCOMMIT ?? "dev"}/`
        }
      ]
    }),
    await staticEmbedDesignData(),
    ...process.env.SKIP_LINT ? [] : [
      eslint({
        include: [resolvePath("**/*.ts"), resolvePath("**/*.tsx")],
        failOnWarning: true
      })
    ]
  ]
});
async function staticEmbedDesignData() {
  const allDesignData = await filesystemToJSON(dataFolderPath);
  return {
    name: "html-transform",
    transformIndexHtml(html, ctx) {
      const isDevMode = !!ctx.server;
      if (!isDevMode) {
        return html.replace(
          "window.STATIC_DESIGN_DATA = undefined",
          `window.STATIC_DESIGN_DATA = ${JSON.stringify(allDesignData)}`
        );
      } else {
        return html;
      }
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIiwgIi4uL2Rlc2lnbi1kYXRhL3NjcmlwdHMvZGF0YUxvY2F0aW9ucy50cyIsICIuLi9kZXNpZ24tZGF0YS9zY3JpcHRzL2ZzLXRvLWpzb24udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnYW1lZFxcXFxEb2N1bWVudHNcXFxcR2l0aHViXFxcXFNreVdlYXZlclxcXFxzaGVldHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGdhbWVkXFxcXERvY3VtZW50c1xcXFxHaXRodWJcXFxcU2t5V2VhdmVyXFxcXHNoZWV0c1xcXFx2aXRlLmNvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2dhbWVkL0RvY3VtZW50cy9HaXRodWIvU2t5V2VhdmVyL3NoZWV0cy92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgZHN2IGZyb20gJ0Byb2xsdXAvcGx1Z2luLWRzdidcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIFBsdWdpbk9wdGlvbiB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCBjaGVja2VyIGZyb20gJ3ZpdGUtcGx1Z2luLWNoZWNrZXInXHJcbmltcG9ydCBlc2xpbnQgZnJvbSAndml0ZS1wbHVnaW4tZXNsaW50J1xyXG5pbXBvcnQgeyB2aXRlU3RhdGljQ29weSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXN0YXRpYy1jb3B5J1xyXG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tICd2aXRlLXRzY29uZmlnLXBhdGhzJ1xyXG5cclxuaW1wb3J0IHsgZGF0YUZvbGRlclBhdGggfSBmcm9tICcuLi9kZXNpZ24tZGF0YS9zY3JpcHRzL2RhdGFMb2NhdGlvbnMnXHJcbmltcG9ydCB7IGZpbGVzeXN0ZW1Ub0pTT04gfSBmcm9tICcuLi9kZXNpZ24tZGF0YS9zY3JpcHRzL2ZzLXRvLWpzb24nXHJcbmNvbnN0IHJlc29sdmVQYXRoID0gKHN0cjogc3RyaW5nKSA9PiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBzdHIpXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogdHJ1ZSxcclxuICAgIHBvcnQ6IDE5OTcsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2Fzc2V0cyc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjQwMDEvJyxcclxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXNzZXRzLywgJycpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGJhc2U6IHByb2Nlc3MuZW52LkdJVENPTU1JVCA/IGAvc2hlZXRzLyR7cHJvY2Vzcy5lbnYuR0lUQ09NTUlUfS9gIDogdW5kZWZpbmVkLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6ICcuL2Rpc3Qvc2hlZXRzJyxcclxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgIG1pbmlmeTogZmFsc2VcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KHtcclxuICAgICAganN4UnVudGltZTogJ2F1dG9tYXRpYydcclxuICAgIH0pLFxyXG4gICAgdHNjb25maWdQYXRocygpLFxyXG4gICAgZHN2KCkgYXMgYW55LFxyXG4gICAgY2hlY2tlcih7IHR5cGVzY3JpcHQ6IHRydWUgfSksXHJcbiAgICB2aXRlU3RhdGljQ29weSh7XHJcbiAgICAgIHRhcmdldHM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzcmM6ICcuLi8qL2xvY2FsZXMvKicsXHJcbiAgICAgICAgICBkZXN0OiBgLi9sb2NhbGVzLyR7cHJvY2Vzcy5lbnYuR0lUQ09NTUlUID8/ICdkZXYnfS9gXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzcmM6ICcuLi9saWIvKi9sb2NhbGVzLyonLFxyXG4gICAgICAgICAgZGVzdDogYC4vbG9jYWxlcy8ke3Byb2Nlc3MuZW52LkdJVENPTU1JVCA/PyAnZGV2J30vYFxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSksXHJcbiAgICBhd2FpdCBzdGF0aWNFbWJlZERlc2lnbkRhdGEoKSxcclxuICAgIC4uLihwcm9jZXNzLmVudi5TS0lQX0xJTlRcclxuICAgICAgPyBbXVxyXG4gICAgICA6IFtcclxuICAgICAgICAgIGVzbGludCh7XHJcbiAgICAgICAgICAgIGluY2x1ZGU6IFtyZXNvbHZlUGF0aCgnKiovKi50cycpLCByZXNvbHZlUGF0aCgnKiovKi50c3gnKV0sXHJcbiAgICAgICAgICAgIGZhaWxPbldhcm5pbmc6IHRydWVcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgXSlcclxuICBdXHJcbn0pXHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdGF0aWNFbWJlZERlc2lnbkRhdGEoKTogUHJvbWlzZTxQbHVnaW5PcHRpb24+IHtcclxuICBjb25zdCBhbGxEZXNpZ25EYXRhID0gYXdhaXQgZmlsZXN5c3RlbVRvSlNPTihkYXRhRm9sZGVyUGF0aClcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ2h0bWwtdHJhbnNmb3JtJyxcclxuICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sLCBjdHgpIHtcclxuICAgICAgY29uc3QgaXNEZXZNb2RlID0gISFjdHguc2VydmVyXHJcbiAgICAgIGlmICghaXNEZXZNb2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZShcclxuICAgICAgICAgICd3aW5kb3cuU1RBVElDX0RFU0lHTl9EQVRBID0gdW5kZWZpbmVkJyxcclxuICAgICAgICAgIGB3aW5kb3cuU1RBVElDX0RFU0lHTl9EQVRBID0gJHtKU09OLnN0cmluZ2lmeShhbGxEZXNpZ25EYXRhKX1gXHJcbiAgICAgICAgKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBodG1sXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnYW1lZFxcXFxEb2N1bWVudHNcXFxcR2l0aHViXFxcXFNreVdlYXZlclxcXFxkZXNpZ24tZGF0YVxcXFxzY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnYW1lZFxcXFxEb2N1bWVudHNcXFxcR2l0aHViXFxcXFNreVdlYXZlclxcXFxkZXNpZ24tZGF0YVxcXFxzY3JpcHRzXFxcXGRhdGFMb2NhdGlvbnMudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2dhbWVkL0RvY3VtZW50cy9HaXRodWIvU2t5V2VhdmVyL2Rlc2lnbi1kYXRhL3NjcmlwdHMvZGF0YUxvY2F0aW9ucy50c1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcclxuXHJcbmV4cG9ydCBjb25zdCBkZXNpZ25EYXRhRm9sZGVyUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8nKVxyXG5leHBvcnQgY29uc3QgZGF0YUZvbGRlclBhdGggPSBwYXRoLmpvaW4oZGVzaWduRGF0YUZvbGRlclBhdGgsICcuL3JhdycpXHJcbmV4cG9ydCBjb25zdCBzaGVldHNGb2xkZXJQYXRoID0gcGF0aC5qb2luKGRhdGFGb2xkZXJQYXRoLCAnLi9zaGVldHMnKVxyXG5leHBvcnQgY29uc3QgY2FyZHNGb2xkZXJQYXRoID0gcGF0aC5qb2luKHNoZWV0c0ZvbGRlclBhdGgsICcuL2NhcmRzJylcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnYW1lZFxcXFxEb2N1bWVudHNcXFxcR2l0aHViXFxcXFNreVdlYXZlclxcXFxkZXNpZ24tZGF0YVxcXFxzY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnYW1lZFxcXFxEb2N1bWVudHNcXFxcR2l0aHViXFxcXFNreVdlYXZlclxcXFxkZXNpZ24tZGF0YVxcXFxzY3JpcHRzXFxcXGZzLXRvLWpzb24udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2dhbWVkL0RvY3VtZW50cy9HaXRodWIvU2t5V2VhdmVyL2Rlc2lnbi1kYXRhL3NjcmlwdHMvZnMtdG8tanNvbi50c1wiO2ltcG9ydCB7IG9wZW5kaXIsIHJlYWRGaWxlIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcydcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xyXG5cclxuYXN5bmMgZnVuY3Rpb24qIHdhbGsoZGlyOiBzdHJpbmcpOiBBc3luY0dlbmVyYXRvcjxzdHJpbmc+IHtcclxuICBmb3IgYXdhaXQgKGNvbnN0IGQgb2YgYXdhaXQgb3BlbmRpcihkaXIpKSB7XHJcbiAgICBjb25zdCBlbnRyeSA9IHBhdGguam9pbihkaXIsIGQubmFtZSlcclxuICAgIGlmIChkLm5hbWUuc3RhcnRzV2l0aCgnLicpKSBjb250aW51ZVxyXG4gICAgaWYgKGQuaXNEaXJlY3RvcnkoKSkgeWllbGQqIGF3YWl0IHdhbGsoZW50cnkpXHJcbiAgICBlbHNlIGlmIChkLmlzRmlsZSgpKSB5aWVsZCBlbnRyeVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbGVzeXN0ZW1Ub0pTT04ocm9vdEZvbGRlcjogc3RyaW5nKTogUHJvbWlzZTxvYmplY3Q+IHtcclxuICBjb25zdCBhbGxSZWFkUHJvbWlzZXM6IGFueVtdID0gW11cclxuICBjb25zdCByb290Rm9sZGVyRGVwdGggPSByb290Rm9sZGVyLnNwbGl0KHBhdGguc2VwKS5sZW5ndGhcclxuICBjb25zdCBqc29uOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge31cclxuICBmb3IgYXdhaXQgKGNvbnN0IGZpbGUgb2Ygd2Fsayhyb290Rm9sZGVyKSkge1xyXG4gICAgY29uc3QgcGFydHMgPSBmaWxlLnNwbGl0KHBhdGguc2VwKS5zbGljZShyb290Rm9sZGVyRGVwdGgpXHJcbiAgICBsZXQgb2JqID0ganNvblxyXG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRzKSB7XHJcbiAgICAgIGlmIChwYXJ0ID09PSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSkge1xyXG4gICAgICAgIGFsbFJlYWRQcm9taXNlcy5wdXNoKFxyXG4gICAgICAgICAgcmVhZEZpbGUoZmlsZSwgJ3V0ZjgnKVxyXG4gICAgICAgICAgICAudGhlbihmID0+IChvYmpbcGFydF0gPSBKU09OLnBhcnNlKGYpKSlcclxuICAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvciBwYXJzaW5nICR7ZmlsZX06ICR7ZXJyfWApXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG9ialtwYXJ0XSA9IG9ialtwYXJ0XSB8fCB7fVxyXG4gICAgICAgIG9iaiA9IG9ialtwYXJ0XVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIGF3YWl0IFByb21pc2UuYWxsKGFsbFJlYWRQcm9taXNlcylcclxuICByZXR1cm4ganNvblxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1YsT0FBTyxTQUFTO0FBQ2xXLE9BQU8sV0FBVztBQUNsQixPQUFPQSxXQUFVO0FBQ2pCLFNBQVMsb0JBQWtDO0FBQzNDLE9BQU8sYUFBYTtBQUNwQixPQUFPLFlBQVk7QUFD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O0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0QsTUFBTSxzQkFBc0I7QUFBQSxJQUM1QixHQUFJLFFBQVEsSUFBSSxZQUNaLENBQUMsSUFDRDtBQUFBLE1BQ0UsT0FBTztBQUFBLFFBQ0wsU0FBUyxDQUFDLFlBQVksU0FBUyxHQUFHLFlBQVksVUFBVSxDQUFDO0FBQUEsUUFDekQsZUFBZTtBQUFBLE1BQ2pCLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDTjtBQUNGLENBQUM7QUFFRCxlQUFlLHdCQUErQztBQUM1RCxRQUFNLGdCQUFnQixNQUFNLGlCQUFpQixjQUFjO0FBQzNELFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLG1CQUFtQixNQUFNLEtBQUs7QUFDNUIsWUFBTSxZQUFZLENBQUMsQ0FBQyxJQUFJO0FBQ3hCLFVBQUksQ0FBQyxXQUFXO0FBQ2QsZUFBTyxLQUFLO0FBQUEsVUFDVjtBQUFBLFVBQ0EsK0JBQStCLEtBQUssVUFBVSxhQUFhLENBQUM7QUFBQSxRQUM5RDtBQUFBLE1BQ0YsT0FBTztBQUNMLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsicGF0aCIsICJwYXRoIiwgInBhdGgiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUiLCAicGF0aCIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSJdCn0K
