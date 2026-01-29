
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5173,
        open: true,
    },
    plugins: [
        {
            name: 'rewrite-middleware',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url.startsWith('/events/')) {
                        req.url = '/event.html';
                    }
                    if (req.url.startsWith('/book/')) {
                        req.url = '/book.html';
                    }
                    next();
                });
            },
        },
    ],
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                event: 'event.html',
                book: 'book.html',
                success: 'success.html'
            }
        }
    }
});
