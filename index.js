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
        name: String,
        productos: [{
            nombre: String, 
            precio: Number,
            imagen: String,
            cantidad: Number
        }]
      });
      
      return mongoose.model('usuarios', usuarioSchema);
       
}

function verificarCampoRequerido(valor, mensaje){
    if (!valor) {
        throw new Error()
    }
}

function isAuthenticated (req, res, next) {
    if (req.session.name) next()
    else res.redirect('/');
  }

const main = async () => {
    
    const app = express();

    await conectDB()
    const UsuarioModel = getUserModel();
    /* const ProductoModel = getProductModel(); */
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
            name,
            productos: []
        })
 
        await nuevoUsuario.save();
        
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
        req.session.username = user.username
        res.redirect('/productos')

    });

    app.post('/logout', (req, res) => {
        req.session.destroy(error => {
            if(error){
                res.send({error: error.message});
                return;
            }
    
            res.redirect('/')
        });
    
    });
    
    app.get('/productos', isAuthenticated, async(req, res) => {

        const {username, name} = req.session

        const user = await UsuarioModel.findOne({username});
        
        res.render('formulario-productos', {
            productos: user.productos,
            usuario: {
                nombre: name
            } 
        });
    });

    app.post('/productos', isAuthenticated, async (req, res) => {
        const {username} = req.session;
        const {nombre, precio, imagen, cantidad} = req.body;

        let err = 'Los siguientes campos son requeridos: '
        const camposFaltantes = []

        try {
            verificarCampoRequerido(nombre);
        } catch (error) {
            camposFaltantes.push('Nombre')
        }

        try {
            verificarCampoRequerido(precio);
        } catch (error) {
            camposFaltantes.push('Precio')
        }

        try {
            verificarCampoRequerido(imagen);
        } catch (error) {
            camposFaltantes.push('Imagen')
        }

        try {
            verificarCampoRequerido(cantidad);            
        } catch (error) {
            camposFaltantes.push('Cantidad')
        }
        
        if(camposFaltantes.length) {
            err = err + camposFaltantes.join(', ');
            return res.status(StatusCodes.BAD_REQUEST).send(err);
        }

        const user = await UsuarioModel.findOne({username});

        user.productos.push({
            nombre,
            precio,
            imagen,
            cantidad
        })

        await user.save()

        res.redirect('/productos')

    })

    const port = 8080;
    app.listen(port, () => {
        console.log(`Servidor ejecutandose en el puerto ${port}`);
    })
}

main();