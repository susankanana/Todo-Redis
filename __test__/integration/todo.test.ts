import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/index'; 
import db from '../../src/drizzle/db';
import { TodoTable, UsersTable } from '../../src/drizzle/schema'
import { eq, is } from 'drizzle-orm';

let token: string;
let userId: number;
let todoId: number;

const testUser = {
    firstName: "Todo",
    lastName: "Tester",
    email: "todouser@mail.com",
    password: "todopass123"
};

beforeAll(async () => {
    // Create a test user
    const hashedPassword = bcrypt.hashSync(testUser.password, 10);
    const [user] = await db.insert(UsersTable).values({
        ...testUser,
        password: hashedPassword,
        role: "admin", // to get access to the todo routes
        isVerified: true // to skip verification checks
    }).returning();
    userId = user.id;

    // login to get the token
    const res = await request(app)
        .post("/auth/login")
        .send({
            email: testUser.email,
            password: testUser.password
        });
    token = res.body.token;
})

afterAll(async () => {
    // Clean up the test user and todo
    await db.delete(TodoTable).where(eq(TodoTable.userId, userId));
    await db.delete(UsersTable).where(eq(UsersTable.email, testUser.email));
    await db.$client.end();
});

describe("Todo API Integration Tests", () => {
    it("Should create a todo", async () => {
        const todo = {
            userId,
            todoName: "Test Todo",
            description: "A test todo",
            dueDate: new Date().toISOString(),
            // isCompleted: false
        };
        const res = await request(app)
            .post("/todo")
            .set("Authorization", `Bearer ${token}`)
            .send(todo);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("message", "Todo created successfully");
        todoId = res.body.todo.id; // Store the created todo ID for later tests
        console.log(`Created Todo ID: ${todoId}`);
    })


    it("Should get all todos", async () => {
        const res = await request(app)
            .get("/todo")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThan(0);
        console.log("Todos:", res.body.data);
    })

    it("should get a todo by id", async () => {
        const res = await request(app)
            .get(`/todo/${todoId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty("id", todoId);
        expect(res.body.data).toHaveProperty("todoName", "Test Todo");
    })


    it("should update a todo", async () => {
        const updated = {
            todoName: "Updated Todo",
            description: "Updated description"
        };
        const res = await request(app)
            .put(`/todo/${todoId}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updated);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Todo updated successfully");
    })

    it("Should delete a todo", async () => {
        const res = await request(app)
            .delete(`/todo/${todoId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(204);
        expect(res.body).toEqual({});
    })

    // NEGATIVE TESTS
    it("should not get a todo with invalid id", async () => {
        const res = await request(app)
            .get("/todo/invalid-id")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Invalid ID");

    })

    it("Should not get a todo with non-existent ID", async () => {

        const res = await request(app)
            .get(`/todo/99999`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            expect.objectContaining({
                message: "Todo not found"
            })
        );
    });

    it("should not update a todo with invalid id", async () => {
        const res = await request(app)
            .put(`/todo/invalid-id`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                todoName: "Updated Todo",
                description: "Updated description"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(
            expect.objectContaining({
                message: "Invalid ID"
            })
        );
    })


    it("should not update a todo with non-existent id", async () => {
        const res = await request(app)
            .put(`/todo/99999`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                todoName: "Updated Todo",
                description: "Updated description"
            });

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            expect.objectContaining({
                message: "Todo not found"
            })
        );
    })

    it("should not delete a todo with invalid id", async () => {
        const res = await request(app)
            .delete(`/todo/invalid-id`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(
            expect.objectContaining({
                message: "Invalid ID"
            })
        );
    })

    it("should not delete a todo with non-existent id", async () => {
        const res = await request(app)
            .delete(`/todo/99999`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            expect.objectContaining({
                message: "Todo not found"
            })
        );
    })

    it("should not allow access without token", async () => {
        const res = await request(app)
            .get("/todo")
            .set("Authorization", ``); // No token

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual(
            expect.objectContaining({
                message: "Unauthorized"
            })
        );
    })





})