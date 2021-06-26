"use strict";

//////////////////////////////////////////
// VARS
//////////////////////////////////////////

// map constructor
const map_gen = (type, y, x, id) => ({
   	type: type,
  	y: y,
   	x: x,
   	id: id, 
   	size: 0,
   	checked: false,
   	room: null,
   	main: false,
   	conect_to_main: false,
   	excluded: false,
})

const MAP_SIZE_X = 50
const MAP_SIZE_Y = 50 
let map = []
let map_id = 0
let main_room = 0

// distance of 2 points
function distance(x1, x2, y1, y2){ 
	let a = x1 - x2;
	let b = y1 - y2;
	let c = Math.sqrt( a*a + b*b );
	return c;
}

///////////////////////////////////////////
// MAP LOAD
///////////////////////////////////////////

function map_load(){

	// map object array creation
	for(var i = 0; i < MAP_SIZE_Y; i++){
			map[i] = []
		for(var j = 0; j < MAP_SIZE_X; j++){

			map[i][j] = map_gen("none", i, j, map_id)

			// random choose of block type
			let rand = Math.floor(Math.random() * 10)

			if (rand <= 4){
				map[i][j].type = "free"
			} else if(rand > 4) {
				map[i][j].type = "block"
			}

			map_id = map_id + 1

		}
	}

}

//////////////////////////////////////////////////////////////
// CELULAR AUTOMATA
//////////////////////////////////////////////////////////////

function check_block_count(row, col, limit){

	let count = 0

	// check 8 positions around the block
 	for(var y = row-1; y <= row+1; y++){
		for(var x = col-1; x <= col+1; x++){
			if(y < MAP_SIZE_Y && y >= 0 && x < MAP_SIZE_X && x >= 0){
				if(y != row || x != col){
					if(map[y][x].type == "block" && distance(col, x, row, y) <= limit){
						count++
					}
				}
			} else { // create incentive for walls in the edges of the map
				count++
			}
		}
	}
	return count
}

function celular_automata(){
 	for(var i = 0; i < MAP_SIZE_Y; i++){
		for(var j = 0; j < MAP_SIZE_X; j++){
			let total = check_block_count(i, j, 2);
			if(total > 4){
				map[i][j].type = "block"
			} else if(total < 4){
				map[i][j].type = "free"
			}
		}
	}
 }

 // single block clean
 function single_block_clean(){
 	for(var i = 0; i < MAP_SIZE_Y; i++){
		for(var j = 0; j < MAP_SIZE_X; j++){
			let total = check_block_count(i, j, 1)
			if(total >= 3){
				map[i][j].type = "block"
			}
		}
	}
 }

//////////////////////////////////////////////////////////////
// DEFINE ROOMS
/////////////////////////////////////////////////////////////

let map_stack = []
let room_counter = 0
let size_counter = 0

 function find_rooms(){
 	for(var i = 0; i < MAP_SIZE_Y; i++){
		for(var j = 0; j < MAP_SIZE_X; j++){
			if(map[i][j].type == "free" && map[i][j].checked == false){
				// define room data
				map_stack.unshift({y: i, x: j})
				size_counter++
				map[i][j].checked = true
				map[i][j].room = room_counter
				return
			}
		}
	}
 }

 function define_room(){
 	while(map_stack.length > 0){
	 	for(var i = 0; i < MAP_SIZE_Y; i++){
			for(var j = 0; j < MAP_SIZE_X; j++){
				if(
					distance(map_stack[map_stack.length-1].x, j, map_stack[map_stack.length-1].y, i) == 1 
					&& map[i][j].checked == false && map[i][j].type == "free"
				){
					// define room data
					map_stack.unshift({y: i, x: j})
					size_counter++
					map[i][j].checked = true
					map[i][j].room = room_counter
				}
			}
		}
		map_stack.pop()

		// define room size for each room and restart while loop
		if(map_stack.length == 0){
			for(var i = 0; i < MAP_SIZE_Y; i++){
				for(var j = 0; j < MAP_SIZE_X; j++){
					if (map[i][j].room == room_counter){ map[i][j].size = size_counter }
				}
			}
			size_counter = 0
			room_counter++
			find_rooms()
		}
	}
 }

//////////////////////////////////////////////////////////////
// FILTER ROOMS
/////////////////////////////////////////////////////////////

function remove_smaller_rooms(){

 	for(var i = 0; i < MAP_SIZE_Y; i++){
		for(var j = 0; j < MAP_SIZE_X; j++){
			if (map[i][j].size < 50){
				map[i][j].excluded = true
				map[i][j].type = 'block'
			}
		}
	}

}

function choose_main_room(){

	let biggest_set = map.map(a => Math.max(...a.map(b => b.size)));
	let final_set = Math.max(...biggest_set.map(o => o));

	let index = 0

 	for(var i = 0; i < MAP_SIZE_Y; i++){
		for(var j = 0; j < MAP_SIZE_X; j++){
			if (map[i][j].size == final_set){
				map[i][j].main = true
				map[i][j].conect_to_main = true
				main_room = map[i][j].room
			} 
		}
	}

}

//////////////////////////////////////////////////////////////
// CONNECT ROOMS
/////////////////////////////////////////////////////////////

function find_closest_room_to_main(){

	let values = []
	let new_values = []
	let index = 0

	for(var y = 0; y < MAP_SIZE_Y; y++){
		for(var x = 0; x < MAP_SIZE_X; x++){
			if (map[y][x].main == true){
				for(var i = 0; i < MAP_SIZE_Y; i++){
					for(var j = 0; j < MAP_SIZE_X; j++){
						if (map[i][j].main !== true && map[i][j].excluded !== true ){
							let dist = distance(map[i][j].x, map[y][x].x, map[i][j].y, map[y][x].y) 
							values.push({distance: dist, x: map[i][j].x, y: map[i][j].y, room: map[i][j].room})
						} 	
					}
				}
			}
		}
	}

	// smallest value
	if (values.length > 0) { new_values = values.reduce((prev, curr) => (prev.distance < curr.distance ? prev : curr)) }

	// no room found
	if (values.length == 0) { return false }

	return new_values 		
}

function connect_to_main(){

	let connection = false
	let stack = []
	let values = find_closest_room_to_main()
	let c = 0

	while(connection == false){
		for(var y = values.y-1; y <= values.y+1; y++){
			for(var x = values.x-1; x <= values.x+1; x++){
				if(y < MAP_SIZE_Y && y >= 0 && x < MAP_SIZE_X && x >= 0){
					if(y != values.y || x != values.x){
						if(y != values.y && x != values.x){ // made to avoid test 8 squares instead of 4
							//
						} else {
							if(map[y][x].main == true){
								connection = true
								return
							} else if(map[y][x].room !== values.room) {
								map[y][x].type = 'free'
								map[y][x].room = map[values.y][values.x].room
								map[y][x].checked = true
								map[y][x].conect_to_main = true
								stack.unshift({y: y, x: x})
							}
						}
					}
				}
			} 
		}
		if (stack.length == 0){
			connection = true
			return
		}
		if (stack.length > 0){
			values.x = stack[stack.length-1].x
			values.y = stack[stack.length-1].y
			stack.pop()
		}
	}

}

function transform_in_main(){

	let values = find_closest_room_to_main()

	for(var y = 0; y < MAP_SIZE_Y; y++){
		for(var x = 0; x < MAP_SIZE_X; x++){
			if (map[y][x].room == values.room){
				map[y][x].room = main_room 
				map[y][x].main = true
			}
		}
	}

}

function repeat_until_all_rooms_connect (){

	let search_end = false

	while(search_end == false){
		find_closest_room_to_main() ? '' : search_end = true
		if (search_end == true){ return } 
		connect_to_main()
		transform_in_main()
	}

}

//////////////////////////////////////////////////////////////
// BLOCKS DRAW
/////////////////////////////////////////////////////////////

function draw_block(){

	// creating caves from current map array
	celular_automata()
	single_block_clean()

	// define rooms
	find_rooms()
	define_room()

	// filter rooms
	remove_smaller_rooms()
	choose_main_room()

	// connect rooms
	find_closest_room_to_main()
	connect_to_main()
	transform_in_main()
	repeat_until_all_rooms_connect ()

	let main = document.querySelector('.map')

	for(var i = 0; i < MAP_SIZE_Y; i++){
		for(var j = 0; j < MAP_SIZE_X; j++){

			function id_name(ttype){return 'map_grid '+ttype}

			let div = document.createElement('div')
			div.setAttribute('data-id', map[i][j].id)
			div.setAttribute('data-y', map[i][j].y)
			div.setAttribute('data-x', map[i][j].x)
			div.setAttribute('data-type', map[i][j].type)
			div.setAttribute('data-size', map[i][j].size)

			if (map[i][j].type == 'free') {
				div.className = id_name('mg_a')
				main.appendChild(div)
			}

			if (map[i][j].type == 'block') {
				div.className = id_name('mg_b')
				main.appendChild(div)
			}

			if (map[i][j].room != undefined && map[i][j].type == 'free') {div.classList.toggle(`area_${map[i][j].room}`)}

			if (map[i][j].main == true) {div.classList.toggle('main')}

			if (map[i][j].conect_to_main == true) {div.classList.toggle('connection')}
		}
	}// END
} 

// map load
map_load()

//draw block
draw_block()