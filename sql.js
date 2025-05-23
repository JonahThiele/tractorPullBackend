//this is going to contain the sql queries to update or get the data of the tractor list
const { Pool} = require('pg')
const env = require('dotenv')
//env.config()

//maybe exporting these will make them work idk
export const host = process.env.AZURE_POSTGRESQL_HOST
export const user = process.env.AZURE_POSTGRESQL_USER
export const password = process.env.AZURE_POSTGRESQL_PORT
export const database = process.env.AZURE_POSTGRESQL_DATABASE

const pool = new Pool({
    host: host,
    user: user,
    password: password,
    max: 20,
    port: port,
    database: database,
    ssl: {
        rejectUnauthorized: false // Azure requires SSL
    }
});

console.log('Attempting to connect to PostgreSQL...');

pool.query('SELECT NOW()')
    .then(result => {
        console.log('✅ PostgreSQL connection successful:', result.rows[0]);
    })
    .catch(err => {
        console.error('❌ PostgreSQL connection failed:', err);
    });

module.exports = {
    //get all the teams
    get_teams: async function(){
        const teams = await pool.query('Select rank, name, "order", distance from teams', [])
        return teams
    },

    //get the specifics about one team -> this might be used more later
    get_team: async function(name) {
        const team = await pool.query('Select rank, name, order, distance from teams where name = $1', [name])
        return team.rows[0]
    },

    //set the distance of a certain team
    set_distance: async function(distance,name) {
        const team = await pool.query('Update teams Set distance = $1 where name = $2', [distance, name])
    },

    //set order might be just for changing one

    //this auto updates everything
    increment_order: async function() {
        const { rows } = await pool.query('SELECT MAX("order") FROM teams');
        const maxOrder = rows[0].max || 0;

        const team = await pool.query('Update teams Set "order" = "order" - 1', [])
        //remove the top one and place it at the end, I don't know yet how the exclusion and leaderboard works for dismissing someone so this is just a test
        const team2 = await pool.query('Update teams Set "order" = $1 + 1 where "order" = 0', [maxOrder])
    },

    //this automatically just adds it to the end of the order
    add_team: async function(name){
        const { rows } = await pool.query('SELECT MAX("order") FROM teams');
        const maxOrder = rows[0].max || 0;
        
        const team = await pool.query(
          'INSERT INTO teams (name, rank, "order", distance) values ($1, 0, $2, 0)', 
          [name, maxOrder + 1]
        );
    },

    get_recorder: async function(username){
        const user = await pool.query('SELECT password, salt, id FROM recorders WHERE username = $1', [username])
        //it should only be one row anyway
        return user.rows[0]
    },

    get_user: async function(username){
        //cheesy way to do this
        const user = await pool.query('SELECT username FROM recorders WHERE id = $1', [username])
        return user.rows[0]
    }
}