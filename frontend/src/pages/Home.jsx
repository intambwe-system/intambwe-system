import React from 'react'
<<<<<<<<< Temporary merge branch 1
import Navbar from '../components/Navbar';
import ServiceSection from '../components/ServiseSection';
=========
import Navbar from '../components/Navbar'
import ServiceSection from '../components/ServiseSection'

>>>>>>>>> Temporary merge branch 2
const Home = () => {
    return (
        <div>
            <Navbar />
<<<<<<<<< Temporary merge branch 1
            <ServiceSection/>
  
=========
        <Testimonial />
>>>>>>>>> Temporary merge branch 2
        </div>
    )
}

export default Home