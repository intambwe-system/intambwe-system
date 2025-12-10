import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import marksService from "../../services/marksService";

const AddMarksPage = () => {
  const { classId, stdId, sbjId } = useParams();
  const [student, setStudent] = useState({});
  const [markType, setMarkType] = useState("assessment");
  const [marks, setMarks] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        // You can use studentService.getStudentById
        const data = await fetch(`/api/student/${stdId}`).then((res) => res.json());
        setStudent(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchStudent();
  }, [stdId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        sbj_id: sbjId,
        emp_id: 1, // replace with logged-in teacher id
        mark_type: markType,
        marks: [{ std_id: stdId, mark: parseFloat(marks), date }],
      };
      const result = await marksService.addMarks(payload);
      alert("Marks added successfully!");
      setMarks("");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h2>Add Marks for {student.std_name}</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Type:
          <select value={markType} onChange={(e) => setMarkType(e.target.value)}>
            <option value="assessment">Assessment</option>
            <option value="exam">Exam</option>
          </select>
        </label>
        <br />
        <label>
          Marks:
          <input
            type="number"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            min="0"
          />
        </label>
        <br />
        <label>
          Date:
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <br />
        <button type="submit">Save Marks</button>
      </form>
    </div>
  );
};

export default AddMarksPage;
