CreateTodo Service
"Should call db.insert with the correct todo data."
"Should return the inserted todo object (including its ID)."
"Should return null if insertion fails (simulate DB error)."

getTodosService
"Should call db.query.TodoTable.findMany."
"Should return an array of todos"
"Should return an empty array if no todos exist."
"Should throw if the DB query fails."

getTodoByIDService
"Should call db.query.TodoTable.findFirst with the correct ID."
"Should return the todo if found."
"Should return undefined if not found."
"Should throw if the DB query fails."

updateTodoService
"Should call db.update with the correct ID and data."
"Should return "Todo Updated Successfully" on success."
"Should throw if the update fails."

deleteTodoService
"Should call db.delete with the correct ID."
"Should return "Todo deleted Successfully" on success."
"Should throw if the delete fails."