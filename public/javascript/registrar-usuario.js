const registraUsuarioButton = document.getElementById('RegistrarUsuario');
registraUsuarioButton.addEventListener("click", crearProducto);

async function registraUsuario() {

    
    const url = "http://localhost:8080/usuario";       
    const nameUsuarioElement = document.getElementById('nameUsuario');
    const name= nameUsuarioElement.value;    
    
    const usernameUsuariolement = document.getElementById('usernameUsuario');
    const username = usernameUsuariolement.value; 

    const passwordUsuarioElement = document.getElementById('passwordUsuario');
    const password = passwordUsuarioElement.value;    
        
    const token = localStorage.getItem('token')
    const data = { name, username, password   }
    
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