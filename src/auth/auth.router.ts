// routing
import { Express } from "express";
import { createUserController, loginUserController, verifyUserController, getAllUsersController, deleteUserController, logoutUserController,resendVerificationController } from "./auth.controller";
import { adminRoleAuth, bothRoleAuth } from '../middleware/bearAuth';
const user = (app: Express) => {
    // route
    app.route("/auth/register").post(
        async (req, res, next) => {
            try {
                await createUserController(req, res)
            } catch (error) {
                next(error)
            }

        }
    )

    // verify user route
    app.route("/auth/verify").post(
        async (req, res, next) => {
            try {
                await verifyUserController(req, res)
            } catch (error) {
                next(error)
            }
        }
    )

    // login route
    app.route("/auth/login").post(
        async (req, res, next) => {
            try {
                await loginUserController(req, res)
            } catch (error) {
                next()
            }
        }

    )

    // get all users route
    app.route("/users").get(
        async (req, res, next) => {
            try {
                await getAllUsersController(req, res)
            } catch (error) {
                next(error)
            }
        }
    )

    // delete user by id route
        app.route('/user/:id').delete(
            async (req, res, next) => {
                try {
                    await deleteUserController(req, res);
                } catch (error: any) {
                    next(error); // Passes the error to the next middleware
                }
            }
        )

    // verify user route
    app.route("/auth/verify").post(
        async (req, res, next) => {
            try {
                await verifyUserController(req, res)
            } catch (error) {
                next(error)
            }
        }
    )
    // Logout route
    app.route('/auth/logout').post(
        bothRoleAuth,
        async (req, res, next) => {
            try {
                await logoutUserController(req, res);
            } catch (error: any) {
                next(error); // Pass the error to the error-handling middleware
            }
        }
    );
    // Resend verification code route
    app.route("/auth/resend-code").post(
        async (req, res, next) => {
           try {
                await resendVerificationController(req, res);
            } catch (error: any) {
                next(error); // Pass errors to your error-handling middleware
            } 
        }
    )
}

export default user;