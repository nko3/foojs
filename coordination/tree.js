function Node() {
  this.isDirectory = false;
  this.data = undefined;
  this.children = {};
}

Node.prototype.getData = function() {
  // reads are local
  this.table.get(path);
};

Node.prototype.setData = function(value, callback) {
  // writes go to ZAB
};

Node.prototype.getChildren = function() {
  // reads are local
  return this.children;
};

function Tree() {
  this.tree = {};
}

Tree.prototype.getNode = function(path) {
  var parts = path.split('/'),
      node = this.tree;
  // iterate the path
  for(var i = 0; i < parts.length; i++) {
    node = node[parts[i]];
  }
  return node;
};

Tree.prototype.createNode = function(path) {

};

Tree.prototype.removeNode = function(path) {
  // writes go to ZAB
};
