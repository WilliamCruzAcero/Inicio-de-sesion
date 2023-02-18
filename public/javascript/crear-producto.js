const createButton = document.getElementById('crear');
createButton.addEventListener("click", crearProducto);

async function crearProducto() {

    const url = "http://localhost:8080/productos";       
    const nombreElement = document.getElementById('nombre');
    const nombre = nombreElement.value;    
    
    const precioElement = document.getElementById('precio');
    const precio = precioElement.value; 

    const imagenElement = document.getElementById('imagen');
    const imagen = imagenElement.value;    
    
    const cantidadElement = document.getElementById('cantidad');
    const cantidad = cantidadElement.value;    
    
    const token = localStorage.getItem('token')
    const data = { nombre, precio, imagen, cantidad }
    
    const fetchConfig = {
        method: 'POST',
        body: JSON.stringify(data),
        headers:{
            'Content-Type': 'application/json',
            'Authorization': token
        }
    }

    const response = await fetch(url, fetchConfig)

    let body;
    switch (response.status) {
        case 401:
        case 403:
            localStorage.removeItem("token")
            window.location = '/'
            break;
        case 200:
            location.reload();
            break;
        default:
            body = await response.json();
            alert(body.error);
            location.reload();
            break;
    }
}

const logoutButton = document.getElementById('logout');
logoutButton.addEventListener("click", cerrarSesion);

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);

}

function cerrarSesion() {
    const token = localStorage.getItem('token')
    const {name} = parseJwt(token)
    alert(`!Hasta luego ${name}¡`)
    localStorage.removeItem("token")
    window.location = '/'
    
}