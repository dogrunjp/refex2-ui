<similar_genes>
    <label>Select a similar gene</label>
    <virtual each={item in infos}>
        <!-- Group of material radios - option 1 -->

        <div class="form-check">
          <input type="checkbox" class="check-input" id={ item.symbol } name="similar_group" data-gid={ item.gene_id } data-sym={ item.symbol } data-name={ item.name }>
          <label class="form-check-label" for={ item.symbol }>
              { item.symbol } ({ item.name }, NCBI_GeneId: { item.gene_id })
          </label>
        </div>
    </virtual>

    <p class="text-right">
        <button type=button id="btn_show_grouped_chart" class="btn btn-primary btn-sm" onclick={similarinfo}>show grouped chart</button>
    </p>

    <script>
        similarinfo(){
            $checkinput = $(".check-input");
            var checked_obj = [];
            checked_obj = $.map($checkinput, function (e) {
                if (e.checked){return e.dataset.gid}
            });
            // gene_idリストを渡す
            window.get_similar_info(checked_obj)
        }

        var self = this;

        // 類似する遺伝子の情報を表示
        obs.on("similarGeneLoaded", function(obj){
            self.infos = obj;
            self.update()
        })
    </script>


</similar_genes>
