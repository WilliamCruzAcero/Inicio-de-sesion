
const registrarUsuario = document.getElementById('registrarUsuario');
registrarUsuario.addEventListener("click", guardarUsuario)


async function guardarUsuario() {
    const url = "http://localhost:8080/user";
    const datoIngresado = {
        name: document.getElementById('nameUsuario').value,
        username: document.getElementById('usernameUsuario').value,
        password: document.getElementById('passwordUsuario').value
    }

    const objetoUsuario = datoIngresado;
               
        const fetchConfig = {
            method: 'POST',
            body: JSON.stringify(objetoUsuario),
            headers:{
                'Content-Type': 'application/json',
                
            }
        }
    
        const response = await fetch(url, fetchConfig)
    
        let body;
        
        switch (response.status) {
            case 401:
            case 403:
                window.location = '/';
                break;
            case 200:
                body= await response.json();
                alert(body.message);
                window.location = '/';
                break;
            default:
                body = await response.json();
                alert(body.error);
                location.reload();
                break;
        }
}

document.getElementById("btn-inicio-sesion").addEventListener("click", irlogin)

function irlogin() {
    window.location = "/"

}