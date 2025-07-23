
   
       

const reactiveCursor=(tool, toolparameters)=>{
    const currentColor = toolparameters.foregroundColor;
    const currentColorRGB = `rgb(${currentColor.r},${currentColor.g},${currentColor.b})`;

    const paintCursor = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" opacity="0.5" fill="${currentColorRGB}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paintbrush-icon lucide-paintbrush"><path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/></svg>`
    const selectCursor = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer-icon lucide-mouse-pointer"><path d="M12.586 12.586 19 19"/><path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"/></svg>`
    const eraserCursor = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" opacity="0.5" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eraser-icon lucide-eraser"><path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/></svg>`
    const fillCursor = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paint-bucket-icon lucide-paint-bucket"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path  d="m5 2 5 5"  /><path d="M2 13h15" /><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" fill="red"/></svg>`
    console.log("se esta ejecuntando este componente de cursor reactivo");
    if(tool=== 'pencil'){
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(paintCursor)}`;
        return `url("${dataUrl}") 10 10, auto`   
    }

    else if(tool==='select'){
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(selectCursor)}`;
        return `url("${dataUrl}") 10 10, auto`   
    }

    else if(tool ==='eraser'){
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(eraserCursor)}`;
        return `url("${dataUrl}") 10 10, auto`   
    }
    else if (tool === 'fill'){
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(fillCursor)}`;
        return `url("${dataUrl}") 10 10, auto`   
    }

    else{
        return `crosshair`   
    }

}

export default reactiveCursor;



