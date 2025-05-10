import { useEffect, useState, useRef } from 'react';

function ShieldDisplay({ name, path }) {
	return (
		<img
			src={path}
			className={` w-[85px] h-fit`}
			alt={`${name} Shield`}
		/>
	);
}

export default ShieldDisplay;
