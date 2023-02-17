// importar dependencias
const mongoose = require('mongoose')
const express = require('express')
const session = require('express-session')
const { StatusCodes } = require('http-status-codes')
const MongoStore = require('connect-mongo')
const bcrypt = require('bcrypt');


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

function verificarCampoRequerido(valor, mensaje) {
    if (!valor) {
        throw new Error()
    }
}

function isAuthenticated(req, res, next) {
    if (req.session.name) next()
    else res.redirect('/');
}

const main = async () => {

    const app = express();

    await conectDB()
    const UsuarioModel = getUserModel();
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json())
    app.use(session({
        secret: 'secret-key',
        resave: false,
        rolling: true,
        saveUninitialized: false,
        cookie: {
            maxAge: 1 * 60 * 1000
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

    app.get('/registrarUsuario', (req, res) => {
        res.render('formulario-registrar-usuario')
    })

    app.post('/user', async (req, res) => {

        const { username, password, name } = req.body;

        if (!username) {
            return res.render('error', {
                mensaje: 'El nombre de usuario es requerido',
                redirigir: '/registrarUsuario'
            })
        }

        var isEmailRegExp = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if(!isEmailRegExp.test(username)) {
            return res.render('error', {
                mensaje: 'El nombre de usuario debe ser un correo electrónico',
                redirigir: '/registrarUsuario'
            })
        }

        if (!password) {
            return res.render('error', {
                mensaje: 'La contraseña es requerida',
                redirigir: '/registrarUsuario'
            })
        }

        if (!name) {
            return res.render('error', {
                mensaje: 'El nombre es requerido',
                redirigir: '/registrarUsuario'
            })
        }

        const usuarioExistente = await UsuarioModel.findOne({ username });

        if (usuarioExistente?.username) {
            return res.render('error', {
                mensaje: 'El nombre de usuario no está disponible',
                redirigir: '/registrarUsuario'
            })
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const nuevoUsuario = new UsuarioModel({
            username,
            password: hashedPassword,
            name,
            productos: []
        })

        await nuevoUsuario.save();

        res.render('mensaje', {mensaje: `Usuario ${username} registrado con exito`})
    });

    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        let user;

        try {
            if (!username) {
                throw new Error('El nombre de usuario es requerido')
            }
    
            if (!password) {
                throw new Error('La contraseña es requerida')
            }
    
            user = await UsuarioModel.findOne({ username });            
    
            if (!user?.username) {
                throw new Error('El usuario no esta registrado');
            }
    
            const hashedPassword = user.password;            
            const isCorrectPassword = await bcrypt.compare(password, hashedPassword)

            if (!isCorrectPassword) {
                throw new Error('El nombre de usuario o contraseña es incorrecta');
            }

        } catch (error) {
            return res.render('error', {
                mensaje: error.message,
                redirigir: '/'
            })
        }
        
        req.session.name = user.name
        req.session.username = user.username
        res.redirect('/productos')
    });

    app.post('/logout', (req, res) => {

        const {name} = req.session

        req.session.destroy(error => {
            if (error) {
                res.send({ error: error.message });
                return;
            }
            res.render('mensaje', {mensaje: `¡Hasta luego ${name}!`})
        });

    });

    app.get('/productos', isAuthenticated, async (req, res) => {

        const { username, name } = req.session

        const user = await UsuarioModel.findOne({ username });

        res.render('formulario-productos', {
            productos: user.productos,
            usuario: {
                nombre: name,
                username
            }
        });
    });

    app.post('/productos', isAuthenticated, async (req, res) => {
        const { username } = req.session;
        const { nombre, precio, imagen, cantidad } = req.body;

        let err = 'Los siguientes campos son requeridos:'
        const camposFaltantes = []

        try {
            verificarCampoRequerido(nombre);
        } catch (error) {
            return res.render('error', {
                mensaje: `${err} Nombre`,
                redirigir: '/productos'
            })
        }

        const user = await UsuarioModel.findOne({ username });
        const productoExistente = user.productos.find(producto => producto.nombre === nombre);

        if (productoExistente) {

            const posicionDelProducto = user.productos.indexOf(productoExistente);

            if (precio) productoExistente.precio = precio
            if (imagen) productoExistente.imagen = imagen
            if (cantidad) productoExistente.cantidad = cantidad

            user.productos[posicionDelProducto] = productoExistente;

        } else {

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

            if (camposFaltantes.length) {
                err = err + ' ' + camposFaltantes.join(', ');
                return res.render('error', {
                    mensaje: err,
                    redirigir: '/productos'
                })
            }

            user.productos.push({
                nombre,
                precio,
                imagen,
                cantidad
            })
        }

        await user.save()

        res.redirect('/productos')

    })

    const port = 8080;
    app.listen(port, () => {
        console.log(`Servidor ejecutandose en el puerto ${port}`);
    })
}

main();