import { documentRouter } from "./documents";
import { addTodo, listTodos } from "./todos";

export default {
	documents: documentRouter,
	listTodos,
	addTodo,
};
