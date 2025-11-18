<template>
  <div>{{ message }}</div>
</template>

<script>/**
* @description Press Your { Function greet } Description
* @param {any} name
* @returns {void}
*/
function greet(name) {
    return `Hello, ${name}`;
}
/**
* @description Press Your { Function farewell } Description
* @param {any} name
* @returns {void}
*/
const farewell = (name) => {
    return `Goodbye, ${name}`;
};
export default {
    name: 'ExampleComponent',
    setup() {
        return {
            greet,
            farewell
        };
    }
};
</script>

<style scoped>
div {
  color: blue;
}
</style>