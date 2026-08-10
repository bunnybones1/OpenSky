"use strict";

var m = ThreeDMath;

function main() {
  var cubeVertices = [
       1, -1,
       1,  1,
      -1,  1,
      -1, -1,
    ];
      
  var texcoords = [
     1, 0,
     0, 0,
     0, 1,
     1, 1,
  ];
    
  var indices = [
     0, 1, 2,
     0, 2, 3,
  ];
    

  var canvas = document.getElementById("c");
  var gl = getWebGLContext(c);
  var clock = 0;
  var then = Date.now() * 0.001;

  var program = createProgramFromScripts(
      gl, ["2d-vertex-shader", "2d-fragment-shader"]);
  gl.useProgram(program);

  var positionLoc = gl.getAttribLocation(program, "a_position");
  var texcoordLoc = gl.getAttribLocation(program, "a_texcoord");
  var worldViewProjectionLoc =
      gl.getUniformLocation(program, "u_worldViewProjection");

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(cubeVertices),
      gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(texcoords),
      gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texcoordLoc);
  gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
    
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW);    

var size = 32
  var tex = createTextTexture(gl, "Hello World", size, size, 255, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
    
  var fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
      gl.TEXTURE_2D, tex, 0);
  var result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (result != gl.FRAMEBUFFER_COMPLETE) {
     alert("unsupported framebuffer");
     return;
  }
    
  var newTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, newTex);
  gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, size, size, 0);
  size *= 0.5;
  gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, size, size, 0);
  size *= 0.5;
  
  
    tex = createTextTexture(gl, "Hello World", 32, 32, 0, 255, 0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
    
  fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
      gl.TEXTURE_2D, tex, 0);
  result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (result != gl.FRAMEBUFFER_COMPLETE) {
     alert("unsupported framebuffer");
     return;
  }
  
  gl.bindTexture(gl.TEXTURE_2D, newTex);
  gl.copyTexImage2D(gl.TEXTURE_2D, 1, gl.RGBA, 0, 0, size, size, 0);
  size *= 0.5;
  gl.copyTexImage2D(gl.TEXTURE_2D, 2, gl.RGBA, 0, 0, size, size, 0);
  size *= 0.5;
  gl.copyTexImage2D(gl.TEXTURE_2D, 3, gl.RGBA, 0, 0, size, size, 0);
  size *= 0.5;
  gl.copyTexImage2D(gl.TEXTURE_2D, 4, gl.RGBA, 0, 0, size, size, 0);
//  gl.generateMipmap(gl.TEXTURE_2D);
    
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    
  function render() {
    var now = Date.now() * 0.001;
    clock += now - then;
    then = now;

    var scale = 4;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    var fieldOfView = Math.PI * 0.25;
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var projection = m.perspective(fieldOfView, aspect, 0.0001, 500);
    var radius = 5;
    var eye = [
        Math.sin(clock) * radius,
        1,
        Math.cos(clock) * radius];
    var target = [0, 0, 0];
    var up = [0, 1, 0];
    var view = m.lookAt(eye, target, up);

    var worldViewProjection = m.multiplyMatrix(view, projection);
    gl.uniformMatrix4fv(
        worldViewProjectionLoc, false, worldViewProjection);
    gl.drawElements(gl.TRIANGLES, 1 * 3 * 2, gl.UNSIGNED_SHORT, 0);
    console.log(gl.getError());
    requestAnimationFrame(render);
  }
  render();
}

var ctxForMakingTextures;
function createTextTexture(gl, str, width, height, r, g, b) {
    // create an offscreen canvas with a 2D canvas context
    if (!ctxForMakingTextures) {
       ctxForMakingTextures = document.createElement("canvas").getContext("2d");
    }
    var ctx = ctxForMakingTextures;
    
    // make it a desired size 
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    
    // fill it a certain color
    ctx.fillStyle = "rgb("+r+","+g+","+b+")";  // red
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // draw some text into it.
    ctx.fillStyle = "rgb("+b+","+r+","+g+")"; // yellow
    ctx.font = "20px sans-serif";
    ctx.fillText("Hello World", -1, 12);
    
    // Now make a texture from it
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
    
    // generate mipmaps or set filtering 
    //gl.generateMipmap(gl.TEXTURE_2D);
    
    return tex;
};

main();