import { autofillRouter } from "./autofill";
import { documentRouter } from "./documents";
import { addTodo, listTodos } from "./todos";

export default {
	autofill: autofillRouter,
	documents: documentRouter,
	listTodos,
	addTodo,
};
