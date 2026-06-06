import { createContext, useContext } from "react";
import { rootStore } from "./RootStore";

const StoreContext = createContext(rootStore);

// Хранит или изменяет состояние приложения для сценария useStores.
export const useStores = () => useContext(StoreContext);