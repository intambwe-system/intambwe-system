import { createContext } from "react";

const TextContext = createContext()

const TextContextProvider =  ({children})=>{

    const values={
        text:'we got to work hard'
    }

    return(
        <TextContext.Provider value={values}></TextContext.Provider>
    )

}