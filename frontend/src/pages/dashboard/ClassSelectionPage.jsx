import React, { useEffect, useState } from "react";
import classService from "../../services/classService";
import { useNavigate } from "react-router-dom";

const ClassSelectionPage = () => {
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

 useEffect(() => {
  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      // If your API returns { status, data }, use data
      setClasses(response.data || []); 
    } catch (error) {
      console.error(error);
      setClasses([]); // fallback
    }
  };
  fetchClasses();
}, []);


  return (
    <div>
      <h2>Select a Class</h2>
      <ul>
      {Array.isArray(classes) &&
  classes.map((cls) => (
    <li key={cls.class_id}>
      {cls.class_name}{" "}
      <button onClick={() => navigate(`/marks/class/${cls.class_id}`)}>
        Select
      </button>
    </li>
  ))}

      </ul>
    </div>
  );
};

export default ClassSelectionPage;
