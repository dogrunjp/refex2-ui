<feature>
    <div class="feature info">
        <div > <span class="symbol">{ symbol } </span></div><div class="name"> ( { name }, NCBI_GeneID: {id} ) <i class="fas fa-info-circle btn" id="show_gene_info"></i></div>
        <div class="comparison"> { state } { compare }</div>
    </div>
    <script>
        var self = this;
        self.compare = "";
        self.state = "";
        obs.on("geneinfoLoaded", function(obj){
            if (!self.name) {
                self.id = obj.id;
                self.name = obj.name;
                self.symbol = obj.symbol;
                self.update()
            }
        });
        obs.on("chartstateChanged", function (obj) {
            self.compare = obj.genes ? obj.genes : "";
            self.state = obj.state ? obj.stage : "";
            self.update()
        });
    </script>
</feature>