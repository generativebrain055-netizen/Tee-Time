-- ============================================================================
-- SEED 100 RANDOM TEST USERS
-- ============================================================================
-- Inserts 100 users with unique phone_number, email, username and random
-- first/last names. Safe to run multiple times (ON CONFLICT DO NOTHING on unique keys).
--
-- Prerequisites: unified_schema.sql (or migrations) applied; uuid extension.
-- ============================================================================

INSERT INTO users (
  phone_number,
  email,
  first_name,
  last_name,
  username,
  is_active,
  is_verified,
  onboarding_completed,
  profile_completed,
  availability_completed
)
SELECT
  '+1555999' || (90000 + n)::text,  -- +15559990001 .. +15559990100 (unique)
  'testuser' || n || '@test.example.com',
  (ARRAY['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth','David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Nancy','Daniel','Lisa','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Kimberly','Paul','Emily','Andrew','Donna','Joshua','Michelle','Kenneth','Dorothy','Kevin','Carol','Brian','Amanda','George','Melissa','Edward','Deborah','Ronald','Stephanie','Timothy','Rebecca','Jason','Sharon','Ryan','Cynthia','Jacob','Kathleen','Gary','Amy','Nicholas','Angela','Eric','Shirley','Jonathan','Anna','Stephen','Brenda','Larry','Pamela','Justin','Emma','Scott','Nicole','Brandon','Helen','Benjamin','Samantha','Samuel','Katherine','Raymond','Christine','Gregory','Debra','Frank','Rachel','Alexander','Catherine','Patrick','Carolyn','Jack','Janet','Dennis','Ruth','Jerry','Maria','Tyler','Heather','Aaron','Diane','Jose','Virginia','Adam','Julie','Nathan','Joyce','Henry','Victoria'])[1 + (floor(random() * 90)::int % 90)],
  (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson','Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes','Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez','Powell','Jenkins','Perry','Russell','Sullivan','Bell','Coleman','Butler','Henderson','Barnes','Gonzales','Fisher','Vasquez','Simmons','Romero','Jordan','Patterson'])[1 + (floor(random() * 90)::int % 90)],
  'testuser_' || n,
  random() > 0.1,
  random() > 0.3,
  random() > 0.2,
  random() > 0.2,
  random() > 0.2
FROM generate_series(1, 100) AS n
ON CONFLICT (phone_number) DO NOTHING;
