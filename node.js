const express = require('express')
const sqlite3 = require('sqlite3')
const path = require('path')
const {format, parse, addMinutes} = require('date-fns')
const {open} = require('sqlite')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'scheduler.db')

let db

const initializeDbAndServer = async () => {
    try {
        db = await open({filename: dbPath, driver: sqlite3.Database });
        app.listen(3000, () => console.log('Server running on port 3000'))
    } catch (error) {
        console.log('Error initializing database:', error.msg)
        process.exit(1)
    }
}

initializeDbAndServer()


app.get('/mentors/', async (request,response) => {
    const {formattedStartTime, duration, interest} = request.body
    console.log(interest)
    const startTime = parse(formattedStartTime, 'HH:mm:ss', new Date())
    console.log(formattedStartTime)
    const endTime = addMinutes(startTime, duration)
    const formattedEndTime = format(endTime, 'HH:mm:ss')
    console.log(formattedEndTime)
    try{
        const nonPrimeMentors = await db.all(`
            SELECT *
            FROM mentor_new
            WHERE is_premium = 0 AND areas_of_expertise LIKE ? AND (TIME(?) >= TIME(availability_start) AND TIME(?) <= TIME(availability_end));
        `, [`%${interest}%`, formattedStartTime, formattedEndTime])

        const primeMentors = await db.all(`
            SELECT *
            FROM mentor_new
            WHERE is_premium = 1 AND areas_of_expertise LIKE ? AND (TIME(?) >= TIME(availability_start) AND TIME(?) <= TIME(availability_end));
        `, [`%${interest}%`, formattedStartTime, formattedEndTime])

        response.send({non_prime_mentors: nonPrimeMentors, prime_mentors: [...primeMentors]})
    } catch(error){
        console.log(error.msg)
    }
}) 

app.post('/booking/', async (request, response) => {
    const {mentorId, courseName, mentorName, availabilityStartTime, duration} = request.body
    const startTime = parse(availabilityStartTime, 'HH:mm:ss', new Date())
    const endTime = addMinutes(startTime, duration)
    const formattedEndTime = format(endTime, 'HH:mm:ss')
    const bookingQuery = `
        INSERT INTO bookings
            (user_id, course_name, mentor_name, start_time, end_time)
        VALUES 
            ( 
                ?,?,?,
                TIME(?),
                TIME(?)
            )
    `
    const booking = await db.run(bookingQuery, [mentorId , courseName, mentorName, availabilityStartTime, formattedEndTime])
    const bookingId = booking.lastId

    response.send(`Booking Confirmed.`)
})

app.get('/available-mentors/', async (request, response) => {
    const getMentors = `
        SELECT * 
        FROM 
            mentor_new
    `
    const mentors = await db.all(getMentors)
    response.send(mentors)
})