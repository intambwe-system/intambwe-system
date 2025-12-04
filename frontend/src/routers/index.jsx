import MainLayout from "../layout/MainLayout";
import Home from "../pages/Home";
import { createBrowserRouter } from 'react-router-dom'

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout></MainLayout>,
        children: [
            { index: true, element: <Home /> }
        ]

    }
])


export default router;
