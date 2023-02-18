// importar dependencias
const mongoose = require('mongoose')
const express = require('express')
const { StatusCodes } = require('http-status-codes')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')

class WebError extends Error {
    constructor (
        message,
        status
    ) {
        super(message)
        this.status = status
    }
}


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
        throw new WebError(mensaje, StatusCodes.BAD_REQUEST)
    }
}
const secret = 'my_secret_too_secret';

function verifyToken(req, res, next) {
    const token = req.headers.authorization ?? req.query.token;
    

    if (!token) {
        res.status(StatusCodes.UNAUTHORIZED).send('No se proporcionó un token de autenticación');
        return;
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.secret = decoded;
        next();
    } catch (error) {
        res.status(StatusCodes.UNAUTHORIZED).send('Token de autenticación no válido');
    }

}

const main = async () => {

    const app = express();

    await conectDB()
    const UsuarioModel = getUserModel();
    app.use(express.urlencoded({ extended: true}));
    app.use(express.json())
    
    app.use('/javascript', express.static(path.join(__dirname, 'public', 'javascript')))
    
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
        if (!isEmailRegExp.test(username)) {
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

        res.render('mensaje', { mensaje: `Usuario ${username} registrado con exito` })
    });
    
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        let user;

        try {
            if (!username) {
                throw new WebError('El nombre de usuario es requerido', StatusCodes.BAD_REQUEST)
            }

            if (!password) {
                throw new WebError('La contraseña es requerida', StatusCodes.BAD_REQUEST)
            }

            user = await UsuarioModel.findOne({ username });

            if (!user?.username) {
                throw new WebError('El usuario no esta registrado', StatusCodes.UNAUTHORIZED);
            }

            const hashedPassword = user.password;
            const isCorrectPassword = await bcrypt.compare(password, hashedPassword)

            if (!isCorrectPassword) {
                throw new WebError('El nombre de usuario o contraseña es incorrecta',  StatusCodes.UNAUTHORIZED);
            }

        } catch (error) {
            return res.status(error.status).json({
                error: error.message
            })           
        }

        const tokenBody = {
            username: user.username,
            name: user.name            
        }

        const token = jwt.sign(tokenBody, secret, { expiresIn: '1h' });

        res.json({ token });

    });

    app.post('/logout', verifyToken , (req, res) => {

        const { name } = req.secret

        res.render('mensaje', { mensaje: `¡Hasta luego ${name}!` })
    
    });

    app.get('/productos', verifyToken, async (req, res) => {

        const { username, name } = req.secret

        const user = await UsuarioModel.findOne({ username });

        res.render('formulario-productos', {
            productos: user.productos,
            usuario: {
                nombre: name,
                username
            }
        });
    });

    app.post('/productos', verifyToken, async (req, res) => {
        const { username } = req.secret;
        const { nombre, precio, imagen, cantidad } = req.body;

        let err = 'Los siguientes campos son requeridos:'
        const camposFaltantes = []

        try {
            verificarCampoRequerido(nombre, `${err} Nombre`);
        } catch (error) {
            return res.status(error.status).json({error: error.message})
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
                return res.status(StatusCodes.BAD_REQUEST).json({error: err})
            }

            user.productos.push({
                nombre,
                precio,
                imagen,
                cantidad
            })
        }

        await user.save()

        res.json({});

    })

    const port = 8080;
    app.listen(port, () => {
        console.log(`Servidor ejecutandose en el puerto ${port}`);
    })
}

main();