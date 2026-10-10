#!/bin/zsh
# Ilustrační fotky – generuje lokální model (factory image). Nejsou to fotky podniku.
cd "${0:a:h}/.."
g() { [[ -f zdroje/fotky/$1.png ]] || factory image --width $2 --height $3 --seed $4 --out zdroje/fotky --name $1 "$5"; }
S="natural documentary photo, 35mm, soft light, no text, no logos"
g pizza 1536 1024 11 "Close-up of a freshly baked rustic Neapolitan style pizza with tomato sauce, mozzarella, basil and salami on a wooden board on an outdoor garden table, $S"
g pizza-smetana 1024 1024 12 "Overhead photo of a white pizza with cream base, mozzarella, bacon, red onion and spinach on a wooden table, $S"
g krabice 1024 1024 13 "Hands holding two plain brown cardboard pizza boxes stacked at a small village bistro counter, takeaway pickup, warm light, $S"
g detsky-koutek 1536 1024 14 "Small fenced children's play corner in a village bistro garden, wooden sandbox, small wooden slide and playhouse, lawn, colourful buckets, parents sitting at tables in background, sunny afternoon, $S"
g pivo 1024 1024 15 "Glass of Czech lager beer with thick foam being poured from a tap, bistro bar, warm light, $S"
g kava-dort 1024 1024 16 "Cup of cappuccino and a slice of homemade cake on a wooden garden table with flowers, cafe, morning light, $S"
g koncert 1536 1024 17 "Small acoustic concert in a village bistro garden in the evening, guitarist and singer on a small wooden stage, string lights, people sitting at wooden tables, children dancing, $S"
g oslava 1536 1024 18 "Birthday celebration with friends at long wooden tables in a garden terrace, pizza and drinks, balloons, laughing people, late afternoon sun, $S"
g cmelak 1536 1024 19 "Macro photograph of a fluffy bumblebee on a purple lavender flower, shallow depth of field, summer garden, $S"
g pec 1024 1024 20 "Pizza being taken out of an oven with a wooden peel, small bistro kitchen, glowing heat, $S"
