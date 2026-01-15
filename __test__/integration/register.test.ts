import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/index';
import db from '../../src/drizzle/db';
import { UsersTable } from '../../src/drizzle/schema';
import { eq } from 'drizzle-orm';

const testUser = {
    firstName: "Reg",
    lastName: "Tester",
    email: "registeruser@mail.com",
    password: "regpass123"
};


afterAll(async () => {
    // Clean up the test user

    await db.delete(UsersTable).where(eq(UsersTable.email, testUser.email));
    await db.$client.end();
})


describe("Post /auth/register", () => {
    it("should register a new user successfully", async () => {
        const res = await request(app)
            .post("/auth/register")
            // hash the password
            .send({
                ...testUser,
                password: bcrypt.hashSync(testUser.password, 10)
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("message", "User created. Verification code sent to email");
    })

    it("should not register a user with an existing email", async () => {
        // register the user again
        await request(app)
            .post("/auth/register")
            .send({
                ...testUser,
                password: bcrypt.hashSync(testUser.password, 10)
            });

        // try to register the same user again
        const res = await request(app)
            .post("/auth/register")
            .send({
                ...testUser,
                password: bcrypt.hashSync(testUser.password, 10)
            });

        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty("error")

    })

    it("should not register a user with missing fields", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({
                firstName: testUser.firstName,
                lastName: testUser.lastName,
                email: testUser.email
                // missing password
            })

        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty("error")
    })
})