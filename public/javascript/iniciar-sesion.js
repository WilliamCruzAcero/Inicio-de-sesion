const loginButton = document.getElementById('login');
loginButton.addEventListener("click", obtenerToken);

async function obtenerToken() {

    const url = "http://localhost:8080/login";       
    const userElement = document.getElementById('username');
    const passwordElement = document.getElementById('password');
    const username = userElement.value;    
    const password = passwordElement.value;
    const data = { username, password }
    
    const fetchConfig = {
        method: 'POST',
        body: JSON.stringify(data),
        headers:{
            'Content-Type': 'application/json'
        }
    }

    const response = await fetch(url, fetchConfig)

    let body;
    switch (response.status) {
        case 200:
            body = await response.json();
            localStorage.setItem("token", body.token)
            window.location = '/productos?token=' + body.token
            break;
        default:
            localStorage.removeItem("token")
            body = await response.json();
            alert(body.error);
            break;
    }
}

document.getElementById("btn").addEventListener("click", irRegistro )



  function irRegistro() {
    window.location = "/registrarUsuario"

  }