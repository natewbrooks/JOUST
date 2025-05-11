import { useEffect, useState, useRef } from 'react';
import SplitScreenUI from './components/SplitScreenUI';
import TextBold from './components/TextBold';
import HeaderUI from './components/HeaderUI';

function UILayout() {
	return (
		<>
			<div
				className='ui-layer'
				style={{ zIndex: 100 }}>
				<HeaderUI />

				<div className='absolute top-0 h-full'>
					<div className={`bg-black h-full w-[30px]`}>{`  `}</div>
					{/* <div className={`h-full flex justify-around w-[50px]`}>
						<img
							src={`/ui/shields/side/BearSideShield.png`}
							alt={`Bear Side Shield 1`}
							className={`z-80  bottom-0`}
						/>
					</div> */}
				</div>
				<div className='absolute top-0 right-0 h-full z-50'>
					<div className={`bg-black h-full w-[30px]`}>{`  `}</div>
				</div>

				{/* <img
					src={'/ui/WoodenBeam.svg'}
					className='h-max -rotate-90 translate-x-[-48.5%]'
					alt='Wooden Beam Left'
				/>

				<div className='absolute top-0 left-[-100%] h-full z-50'></div>
				<div className='absolute top-0 right-[-100%] h-full z-50'>
					<img
						src={'/ui/WoodenBeam.svg'}
						className='h-full rotate-90 scale-x-105'
						alt='Wooden Beam Left'
					/>
				</div> */}

				<div className='center-screen'>
					<SplitScreenUI />

					<div className='w-full flex justify-center items-center'>
						{/* {countdown > 0 && (
							<div className='text-black bg-cream w-[100px] text-center pt-2 rounded-full h-fit font-medieval text-8xl'>
								<div className={`relative top-1`}>{countdown}</div>
							</div>
						)} */}
					</div>
				</div>
			</div>
		</>
	);
}

export default UILayout;
