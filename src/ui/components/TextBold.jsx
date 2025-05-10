function TextBold({ text, className }) {
	return (
		<>
			<p
				className={`${
					className ? className : ' text-[42px]'
				} relative z-10 font-medieval font-extrabold`}
				style={{ textShadow: '1px 0 currentColor, -1px 0 currentColor' }}>
				{text}
			</p>
		</>
	);
}

export default TextBold;
