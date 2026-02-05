import { createContext, useContext } from "react";
import { rootStore } from "./RootStore";

const StoreContext = createContext(rootStore);

export const useStores = () => useContext(StoreContext);