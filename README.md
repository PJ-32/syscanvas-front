# Guía de Instalación y Configuración de SysCanvas

## Software Requerido
* Oracle 21c
* Java 21 o 22
* Maven
* Visual Studio Code

## Extensiones de VS Code
Debes instalar las siguientes extensiones en tu entorno de desarrollo:
* Oracle SQL Developer Extension for VSCode
* Extension Pack for Java
* Lombok Annotations Support for VS Code
* Spring Boot Extension Pack
* Node.js

---

## Pasos de Instalación

### 1. Configurar Oracle 21c
Puedes levantar directamente tu contenedor de Oracle 21c en Docker para mantener tu entorno local limpio, o realizar la instalación tradicional descargando la versión XE desde la página oficial:
* **Enlace de descarga (Instalador Local XE):** [Oracle Database XE Downloads](https://www.oracle.com/latam/database/technologies/xe-downloads.html)

### 2. Instalar Java 21 o 22
Descarga e instala la versión de tu preferencia:
* **Java 21:** [Enlace de descarga](https://www.oracle.com/java/technologies/javase/jdk21-archive-downloads.html)
* **Java 22:** [Enlace de descarga](https://www.oracle.com/java/technologies/javase/jdk22-archive-downloads.html)

### 3. Configurar Maven
* Descarga el archivo **Binary zip archive** desde la página oficial de Apache: [Maven Download](https://maven.apache.org/download.cgi)
* Mueve el archivo descargado al disco `C:` y descomprímelo.
* Copia la ruta donde se encuentra la carpeta `bin`.
* En las variables de entorno de Windows, crea una nueva variable llamada `MAVEN_HOME` y en la variable `Path`, agrega el valor `%MAVEN_HOME%\bin`. A veces es necesario subirlo.

### 4. Preparar Visual Studio Code
* Descarga el editor desde su sitio oficial: [Visual Studio Code](https://code.visualstudio.com/)
* Instala todas las extensiones mencionadas en la sección superior.

### 5. Configurar la Base de Datos SYSCANVAS
Ejecuta el siguiente bloque SQL en tu instancia de Oracle para crear el usuario y otorgar los permisos necesarios:

```sql
CREATE USER SYSCANVAS IDENTIFIED BY SYSCANVAS;
GRANT CONNECT, RESOURCE TO SYSCANVAS;
ALTER USER SYSCANVAS QUOTA UNLIMITED ON USERS;
```

### 6. Secuencia de Ejecución de Scripts SQL
Al momento de crear la estructura completa de la base de datos, debes ejecutar los scripts estrictamente en este orden:
* Creación -> Constraints -> FK -> Procedures -> Triggers -> Inserción -> ScripsFaltantes

### 7. Levantar el Backend (Spring Boot)
Abre una terminal en la raíz del proyecto y desplázate a la carpeta del servidor:
```cmd
cd backend
```
Utiliza estos comandos de Maven en tu terminal para gestionar la aplicación:
* **Para correr la aplicación:** `mvn spring-boot:run`
* **Para limpiar y recompilar antes de correr:** `mvn clean spring-boot:run`

*El servidor de la API REST estará escuchando en **http://localhost:8080**.*

### 8. Levantar el Frontend (Angular)

Abre una **segunda terminal** en la raíz del proyecto y desplázate a la carpeta de la interfaz:
```cmd
cd frontend
```
Instala las dependencias de Node por primera vez (obligatorio si clonas el proyecto o estás en una nueva PC):
```cmd
npm install
```
Enciende el servidor local de Angular:
```cmd
ng serve -o
```
*El flag \-o abrirá automáticamente tu navegador predeterminado en **http://localhost:4200**.*

---

## Acceso y Credenciales

Puedes iniciar sesión y probar los flujos del sistema con cualquiera de las siguientes cuentas de prueba:

**Usuarios de prueba disponibles:**
* **Usuario:** `1011` | **Contraseña:** `RgarciaP85`
* **Usuario:** `1012` | **Contraseña:** `MrodriguezR92`
* **Usuario:** `1013` | **Contraseña:** `CluqueC90`
* **Usuario:** `1014` | **Contraseña:** `AsotoM88`
