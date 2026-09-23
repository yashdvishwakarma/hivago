// vite.config.ts
import { defineConfig } from "file:///C:/Users/Aditya/OneDrive/Desktop/Celsys/Hivago/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Aditya/OneDrive/Desktop/Celsys/Hivago/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/Aditya/OneDrive/Desktop/Celsys/Hivago/node_modules/@tailwindcss/vite/dist/index.mjs";
var postToGetPlugin = () => {
  return {
    name: "post-to-get",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.method === "POST" && (req.url?.startsWith("/payment-success") || req.url?.startsWith("/payment-failure"))) {
          req.method = "GET";
        }
        next();
      });
    }
  };
};
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss(), postToGetPlugin()],
  server: {
    proxy: {
      "/api": {
        target: "https://rally-production-2004.up.railway.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/api/, "/api")
      },
      "/hubs": {
        target: "https://rally-production-2004.up.railway.app",
        changeOrigin: true,
        ws: true
        // Enable WebSocket proxying for SignalR
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZGl0eWFcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxDZWxzeXNcXFxcSGl2YWdvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZGl0eWFcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxDZWxzeXNcXFxcSGl2YWdvXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BZGl0eWEvT25lRHJpdmUvRGVza3RvcC9DZWxzeXMvSGl2YWdvL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuLy8gVml0ZSBwbHVnaW4gdG8gcmV3cml0ZSBQT1NUIHJlcXVlc3RzIHRvIEdFVCBzbyBSZWFjdCBSb3V0ZXIgY2FuIGhhbmRsZSBwYXltZW50IGdhdGV3YXkgcmVkaXJlY3RzIG5hdGl2ZWx5XG5jb25zdCBwb3N0VG9HZXRQbHVnaW4gPSAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3Bvc3QtdG8tZ2V0JyxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyOiBhbnkpIHtcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcTogYW55LCBfcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIChyZXEudXJsPy5zdGFydHNXaXRoKCcvcGF5bWVudC1zdWNjZXNzJykgfHwgcmVxLnVybD8uc3RhcnRzV2l0aCgnL3BheW1lbnQtZmFpbHVyZScpKSkge1xuICAgICAgICAgIHJlcS5tZXRob2QgPSAnR0VUJztcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKSwgcG9zdFRvR2V0UGx1Z2luKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vcmFsbHktcHJvZHVjdGlvbi0yMDA0LnVwLnJhaWx3YXkuYXBwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9hcGkvLCAnL2FwaScpXG4gICAgICB9LFxuICAgICAgJy9odWJzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL3JhbGx5LXByb2R1Y3Rpb24tMjAwNC51cC5yYWlsd2F5LmFwcCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgd3M6IHRydWUgLy8gRW5hYmxlIFdlYlNvY2tldCBwcm94eWluZyBmb3IgU2lnbmFsUlxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFUsU0FBUyxvQkFBb0I7QUFDdlcsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBR3hCLElBQU0sa0JBQWtCLE1BQU07QUFDNUIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sZ0JBQWdCLFFBQWE7QUFDM0IsYUFBTyxZQUFZLElBQUksQ0FBQyxLQUFVLE1BQVcsU0FBYztBQUN6RCxZQUFJLElBQUksV0FBVyxXQUFXLElBQUksS0FBSyxXQUFXLGtCQUFrQixLQUFLLElBQUksS0FBSyxXQUFXLGtCQUFrQixJQUFJO0FBQ2pILGNBQUksU0FBUztBQUFBLFFBQ2Y7QUFDQSxhQUFLO0FBQUEsTUFDUCxDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjtBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxHQUFHLGdCQUFnQixDQUFDO0FBQUEsRUFDbkQsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLE9BQU8sTUFBTTtBQUFBLE1BQy9DO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxJQUFJO0FBQUE7QUFBQSxNQUNOO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
