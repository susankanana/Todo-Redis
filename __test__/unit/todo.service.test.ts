import {
    createTodoService,
    getTodoService,
    getTodoByIdService,
    updateTodoService,
    deleteTodoService
} from "../../src/todo/todo.service"
import db from "../../src/drizzle/db"
import { TodoTable } from "../../src/drizzle/schema"

// mock the modules
jest.mock("../../src/drizzle/db", () => ({
    insert: jest.fn(), // a dummy function that doesn't do anything unless you tell it what to return, hence we will reference it later
    update: jest.fn(),
    delete: jest.fn(),
    query: {
        TodoTable: {
            findMany: jest.fn(),
            findFirst: jest.fn()
        }
    }

}))

beforeEach(() => {
    jest.clearAllMocks();
});

describe("Todo Service", () => {
    describe("createTodoService", () => {
        it("should insert a todo and return the inserted todo", async () => {
            const todo = {  // Mock todo object to be inserted
                todoName: "Test Todo",
                description: "desc",
                userId: 1,
                dueDate: new Date()
            };  
            const inserted = { id: 1, ...todo };  //what you get back after inserting a todo has an ID that we didn't specify in the todo properties.
            // chaining -checking the behaviour of what happens when inserting something
            (db.insert as jest.Mock).mockReturnValue({  //as jest.Mock is the type of what you want to return. Defined at the top
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValueOnce([inserted])
                })
            });

            const result = await createTodoService(todo)
            expect(db.insert).toHaveBeenCalledWith(TodoTable)
            expect(result).toEqual(inserted)
        })


        // it("should return null if insertion fails", async () => {  //this alone should return null since a todo was not provided
        //     (db.insert as jest.Mock).mockReturnValue({
        //         values: jest.fn().mockReturnValue({
        //             returning: jest.fn().mockResolvedValueOnce([null])
        //         })
        //     })
        // })

        //sometimes we can mock a todo and expect it to return null
        it("should return null if insertion fails", async () => {
            (db.insert as jest.Mock).mockReturnValue({ //You tell typescript, treat this like a Jest mock, so I can use mock functions on it. Kind of building a fake return structure to simulate how your actual database layer behaves.
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValueOnce([null]) //Aa
                })
            })   

            const todo = {
                todoName: "Fail Todo",
                description: "desc",
                userId: 1,
                dueDate: new Date()
            };

            const result = await createTodoService(todo);
            expect(result).toBeNull()  // this will be null because at Aa, we had said we want the result to be null

        })

    })


    describe("getTodosService", () => {
        it("should return all todos", async () => {
            const todos = [
                { id: 1, todoName: "Todo 1", description: "desc 1", userId: 1, dueDate: new Date() },
                { id: 2, todoName: "Todo 2", description: "desc 2", userId: 1, dueDate: new Date() }
            ];
            (db.query.TodoTable.findMany as jest.Mock).mockResolvedValueOnce(todos)

            const result = await getTodoService()
            expect(result).toEqual(todos)
        })

        it("should return empty array if no todos", async () => {
            (db.query.TodoTable.findMany as jest.Mock).mockResolvedValueOnce([])
            const result = await getTodoService()
            expect(result).toEqual([])
        })
    })


    describe("getTodoByIdService", () => {
        it("should return a todo if found", async () => {
            const todo = {
                id: 1,
                todoName: "Todo 1",
                description: "desc",
                userId: 1,
                dueDate: new Date()
            };
            (db.query.TodoTable.findFirst as jest.Mock).mockResolvedValueOnce(todo)

            const result = await getTodoByIdService(1) //Bb
            expect(db.query.TodoTable.findFirst).toHaveBeenCalled()
            expect(result).toEqual(todo)
        })

        it("should return undefined if not found", async () => {
            (db.query.TodoTable.findFirst as jest.Mock).mockResolvedValueOnce(undefined) //hover on Bb to know what to return when querring db fails
            const result = await getTodoByIdService(9999)  //get an id that doesn't exist
            expect(result).toBeUndefined()
        })


    })

    describe("updateTodoService", () => {
        it("should update a todo and return success message", async () => {
            // (db.update as jest.Mock).mockReturnValue({
            //     set: jest.fn().mockReturnValue({
            //         where: jest.fn().mockResolvedValueOnce(undefined) //update will be successful but we expect nothing to be returned (just the success message)
            //     })
            // })
            //ensure mock chain includes .returning() method for tests to pass
            (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnValue({
             where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValueOnce([])
              })
             })
           });

            const result = await updateTodoService(1, {
                todoName: "Updated",
                description: "Updated Desc",
                userId: 1,
                dueDate: new Date()
            })

            expect(db.update).toHaveBeenCalledWith(TodoTable)
            expect(result).toBe("Todo updated successfully")
        })
    })

    describe("deleteTodoService", () => {
        it("should delete a todo and return success message", async () => {
            // (db.delete as jest.Mock).mockReturnValue({
            //     where: jest.fn().mockResolvedValueOnce(undefined)
            // })
            (db.delete as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnValue({
               returning: jest.fn().mockResolvedValueOnce([])
           })
          });


            const result = await deleteTodoService(1);
            expect(db.delete).toHaveBeenCalledWith(TodoTable)
            expect(result).toBe("Todo deleted successfully");


        })
    })


})