// importar dependencias
const mongoose = require('mongoose')
const express = require('express')
const session = require('express-session')
const {StatusCodes} = require('http-status-codes')
const MongoStore = require('connect-mongo')


const conectDB = async () => {
    try {
    await mongoose.connect('mongodb+srv://william:1234@database.vicdvt5.mongodb.net/ecommerce?retryWrites=true&w=majority', {
        serverSelectionTimeoutMS: 60 * 1000,
    }) 
    console.log('Base de datos conectada');   
    } catch (error) {
    console.log('Error en la conexion a la base de datos' + error);
    }
}

const getUserModel = () => {
    const usuarioSchema = new mongoose.Schema({
        username: String,
        password: String,
        name: String
    })
   return mongoose.model('usuarios', usuarioSchema)
}

function isAuthenticated (req, res, next) {
    if (req.session.name) next()
    else res.redirect('/');
  }

const main = async () => {
    
    let usuarios = []
    const app = express();

    await conectDB()
    const UsuarioModel = getUserModel();
    app.use(express.urlencoded({extended: false}));
    app.use(express.json())
    app.use(session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 3 * 60 * 1000
        },
        store: new MongoStore({
            client: mongoose.connection.getClient(),
            dbName: "ecommerce",
            collectionName: "sessions",
            stringify: false,
            autoRemove: 'interval',
            autoRemoveInterval: 1 //minutes

        })
    }));


    app.set('views', './views');
    app.set('view engine', 'ejs');

    app.get('/', (req, res) => {
        res.render('formulario-inicio-sesion');
    });

    app.get('/productos', isAuthenticated, (req, res) => {
        const productos = [
            {
                nombre: "tomate",
                precio: 30,
                imagen: "https://www.quironsalud.es/idcsalud-client/cm/images?locale=es_ES&idMmedia=2299323"
            }
        ]
        res.render('formulario-productos', {productos});
    });
    
    app.post('/api/user', async (req, res) => {
    
        const {username, password, name} = req.body;
    
        if (!username) {
            return res.status(StatusCodes.BAD_REQUEST).send('El nombre de usuario es requerido')
        }
    
        if (!password) {
            return res.status(StatusCodes.BAD_REQUEST).send('La contraseña es requerida')
        }

        if (!name) {
            return res.status(StatusCodes.BAD_REQUEST).send('El nombre es requerido')
        }
    
        const usuarioExistente = await UsuarioModel.findOne({username});

        if ( usuarioExistente?.username ) {
            return res.status(StatusCodes.BAD_REQUEST).send('El nombre de usuario no está disponible');
        }
    
        const nuevoUsuario = new UsuarioModel({
            username,
            password,
            name
        })

        await nuevoUsuario.save();
        
        console.log(`Usuario ${username} registrado con exito`);    
        res.send(`Usuario ${username} registrado con exito`) 
    });

    app.post('/login', async (req, res) => {
        const {username, password} = req.body;

        if (!username) {
            return res.status(StatusCodes.BAD_REQUEST).send('El nombre de usuario es requerido')
        }
    
        if (!password) {
            return res.status(StatusCodes.BAD_REQUEST).send('La contraseña es requerida')
        }
    
        const user = await UsuarioModel.findOne({username});

        if ( !user?.username ) {
            return res.status(StatusCodes.UNAUTHORIZED).send('El usuario no esta registrado');
        }

        if( password !== user.password ) {
            return res.status(StatusCodes.UNAUTHORIZED).send('Nombre de usuario o contraseña es incorrecta')
        } 

        req.session.name = user.name
        res.redirect('/productos')

    });
    
    
    // Definir la ruta "olvidar"
    
    /* app.get('/olvidar', (req, res) => {
        req.session.destroy(error => {
            if(error){
                res.send({error: error.message});
                return;
            }
    
            res.send('¡Hasta luego!')
        });
    }); */
    
    // configurar servidor
    
    
    const port = 8080;
    app.listen(port, () => {
        console.log(`Servidor ejecutandose en el puerto ${port}`);
    })
}

main();