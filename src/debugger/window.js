export function window_init() {

	document.querySelectorAll("[window]").forEach((element) => {

		setupResize(element);

		const panelPos= JSON.parse(localStorage.getItem(`panelPos-${element.id}`));
		if(panelPos) {
			element.style.left= panelPos.left;
			element.style.top= panelPos.top;
		}

		let isPanelMoving;
		let isPanelOffset;
		const handle= element.querySelector("[window-title]");

		const options= handle.getAttribute("window-title").split(" ");
		if(options.includes("close")) {
			const closeIcn= document.createElement("img");
			closeIcn.style.position= "absolute";
			closeIcn.style.right= "2px";
			closeIcn.src= "/assets/icons/debug_close.svg";
			closeIcn.className= "btn icn";
			closeIcn.addEventListener("click", () => { element.style.visibility= "hidden" });
			handle.appendChild(closeIcn)
		}

		handle.addEventListener('mousedown', (e) => {
			isPanelMoving= true;
			isPanelOffset= [
				element.offsetLeft - e.clientX,
				element.offsetTop - e.clientY
			];
		}, true);

		handle.addEventListener('mousemove', (e) => {
			e.preventDefault();
			if (isPanelMoving) {
				const mousePosition= {
					x : e.clientX,
					y : e.clientY
				};
				element.style.left= `${(mousePosition.x + isPanelOffset[0])}px`;
				element.style.top= `${(mousePosition.y + isPanelOffset[1])}px`;
			}
		}, true);

		handle.addEventListener('mouseup', () => {
			isPanelMoving= false;
			localStorage.setItem(`panelPos-${element.id}`,JSON.stringify({
				top: element.style.top,
				left: element.style.left
			}));
		}, true);
	});

}

const ResizeEvent = new Event("resize");

function setupResize(window) {

	let isPanelResizing= false;

	window.addEventListener('mousedown', (e) => {

		if(e.offsetY > window.clientHeight-5) {
			isPanelResizing= true;
			window.className= "resizing";
		}
	}, true);

	window.addEventListener('mouseup', (e) => {
		isPanelResizing= false;
		window.className= "";
	}, true);
	window.addEventListener('mouseleave', (e) => {
		isPanelResizing= false;
		window.className= "";
	}, true);

	window.addEventListener('mousemove', (e) => {
		e.preventDefault();
		if (isPanelResizing) {
			const mousePosition= {
				x : e.clientX,
				y : e.clientY
			};

			const deltaX= mousePosition.x -  window.offsetLeft;
			const deltaY= mousePosition.y - window.offsetTop;

			window.style.width= `${(deltaX)}px`;
			window.style.height= `${(deltaY)}px`;

			window.dispatchEvent(ResizeEvent);
		}
	}, true);

}
