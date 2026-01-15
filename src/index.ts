// import express from 'express';
// import user from './auth/auth.router';
// import todo from './todo/todo.router';

// export const app = express();
// app.use(express.json()); //used to parse JSON bodies

// // routes
// user(app);
// todo(app);

// app.get('/', (req, res) => {
//     res.send('Hello, World!');
// })

// app.listen(8081, () => {
//     console.log('Server is running on http://localhost:8081');
//}) 
import express from 'express';
import user from './auth/auth.router';
import todo from './todo/todo.router';
import { logger } from './middleware/logger';
import { rateLimiterMiddleware } from './middleware/rateLimiter';
import cors from 'cors';

const initilizeApp = () => {
    const app = express();
    app.use(express.json()); //used to parse JSON bodies
    app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
 }))
    app.use(logger)
    app.use(rateLimiterMiddleware)

    // routes
    user(app);
    todo(app);

    app.get('/', (req, res) => {
        res.send('Hello, World!');
    })

    return app;

}

const app = initilizeApp();
export default app;