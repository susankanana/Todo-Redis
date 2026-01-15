import {
    createTodoController, getTodoController, getTodoByIdController,getTodosByUserIdController, updateTodoController, deleteTodoController
} from "./todo.controller";

import { Express } from 'express';
import { adminRoleAuth, bothRoleAuth, userRoleAuth, } from '../middleware/bearAuth';


const todo = (app: Express) => {
    // create todo route
    app.route('/todo').post(
        bothRoleAuth,
        async (req, res, next) => {
            try {
                await createTodoController(req, res);
            } catch (error: any) {
                next(error); // Passes the error to the next middleware
            }
        }
    )

    // get all todos route
    app.route('/todo').get(
        adminRoleAuth,
        async (req, res, next) => {
            try {
                await getTodoController(req, res);
            } catch (error: any) {
                next(error); // Passes the error to the next middleware
            }
        }
    )

    // get todo by id route
    app.route('/todo/:id').get(
        adminRoleAuth,
        async (req, res, next) => {
            try {
                await getTodoByIdController(req, res);
            } catch (error: any) {
                next(error); // Passes the error to the next middleware
            }
        }
    )

    // update todo by id route
    app.route('/todo/:id').put(
        adminRoleAuth,
        async (req, res, next) => {
            try {
                await updateTodoController(req, res);
            } catch (error: any) {
                next(error); // Passes the error to the next middleware
            }
        }
    )

    // delete todo by id route
    app.route('/todo/:id').delete(
        adminRoleAuth,
        async (req, res, next) => {
            try {
                await deleteTodoController(req, res);
            } catch (error: any) {
                next(error); // Passes the error to the next middleware
            }
        }
    )

    app.route('/todo/user/:userId').get(
        bothRoleAuth,
        async (req, res, next) => {
            try {
                await getTodosByUserIdController(req, res)
            } catch (error) {
                next(error)
            }
        }
    )

    
}

export default todo;