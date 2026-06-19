// Using native fetch in Node.jsin node > 18
async function run() {
    try {
        const res = await fetch('http://127.0.0.1:3001/api/validade-critica/resumo');
        console.log(res.status);
        console.log(await res.text());
        
        const res2 = await fetch('http://127.0.0.1:3001/api/validade-critica');
        console.log(res2.status);
        console.log(await res2.text());
    } catch(e) {
        console.error(e);
    }
}
run();
