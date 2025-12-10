import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import classService from "../../services/classService";

const StudentListPage = () => {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();
useEffect(() => {
  const fetchStudentsAndSubjects = async () => {
    try {
      const studentResponse = await classService.getClassStudents(classId);
      // If API returns { data: [...] }, use data
      setStudents(Array.isArray(studentResponse.data) ? studentResponse.data : []);

      const subjectResponse = await classService.getClassSubjects(classId);
      setSubjects(Array.isArray(subjectResponse.data) ? subjectResponse.data : []);
    } catch (error) {
      console.error(error);
      setStudents([]);
      setSubjects([]);
    }
  };
  fetchStudentsAndSubjects();
}, [classId]);


  return (
    <div>
      <h2>Students in Class</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Name</th>
            <th>Subject</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((std) => (
            <tr key={std.std_id}>
              <td>{std.std_name}</td>
              <td>
                <select
                  onChange={(e) =>
                    navigate(
                      `/marks/class/${classId}/student/${std.std_id}/subject/${e.target.value}`
                    )
                  }
                >
                  <option value="">Select subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.sbj_id} value={sub.sbj_id}>
                      {sub.sbj_name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  onClick={() =>
                    navigate(`/marks/class/${classId}/student/${std.std_id}`)
                  }
                >
                  Add Marks
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentListPage;
